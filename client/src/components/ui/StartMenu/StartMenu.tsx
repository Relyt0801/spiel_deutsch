import { useState, useEffect, useRef } from 'react'
import { connectSocket } from '../../../socket/socketClient'
import { registerSocketHandlers } from '../../../socket/socketHandlers'
import { getClientToken } from '../../../socket/session'
import { useSocketStore } from '../../../store/socketStore'
import { useUiStore } from '../../../store/uiStore'
import { getSocket } from '../../../socket/socketClient'
import type { PlayerColor, PieceType } from '../../../types/game'
import { PLAYER_COLORS, PIECE_LABELS } from '../../../types/game'
import styles from './StartMenu.module.css'

const PIECES: PieceType[] = ['Radiergummi', 'Lineal', 'Bleistift', 'Spitzer', 'Tintenfüller', 'Buch', 'Schere', 'Globus', 'Taschenrechner']
const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'brown']

export function StartMenu() {
  const [name, setName] = useState('')
  const [color, setColor] = useState<PlayerColor>('red')
  const [piece, setPiece] = useState<PieceType>('Radiergummi')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [connectSeconds, setConnectSeconds] = useState(0)
  const [takenPieces, setTakenPieces] = useState<string[]>([])
  const [takenColors, setTakenColors] = useState<string[]>([])
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorMessage = useUiStore(s => s.errorMessage)
  const setError = useUiStore(s => s.setError)
  const connectionStatus = useSocketStore(s => s.connectionStatus)

  useEffect(() => {
    connectSocket()
    registerSocketHandlers() // connection status is handled inside (guarded once)
    if (getSocket().connected) useSocketStore.getState().setConnectionStatus('connected')
    else useSocketStore.getState().setConnectionStatus('connecting')
    const socket = getSocket()
    const onPeek = ({ takenPieces: tp, takenColors: tc }: { takenPieces: string[]; takenColors: string[] }) => {
      setTakenPieces(tp)
      setTakenColors(tc)
    }
    socket.on('room:peek-result', onPeek)
    return () => {
      socket.off('room:peek-result', onPeek)
    }
  }, [])

  useEffect(() => {
    if (connectionStatus === 'connected') { setConnectSeconds(0); return }
    const t = setInterval(() => setConnectSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [connectionStatus])

  const handleRoomCodeChange = (val: string) => {
    const upper = val.toUpperCase()
    setRoomCode(upper)
    setTakenPieces([])
    setTakenColors([])
    if (peekTimer.current) clearTimeout(peekTimer.current)
    if (upper.length === 6) {
      peekTimer.current = setTimeout(() => {
        getSocket().emit('room:peek', { roomCode: upper })
      }, 300)
    }
  }

  const handleCreate = () => {
    if (!name.trim()) { setError('Bitte Namen eingeben.'); return }
    setError(null)
    getSocket().emit('room:create', { playerName: name.trim(), color, piece, clientToken: getClientToken() })
  }

  const handleJoin = () => {
    if (!name.trim()) { setError('Bitte Namen eingeben.'); return }
    if (!roomCode.trim()) { setError('Bitte Raum-Code eingeben.'); return }
    setError(null)
    getSocket().emit('room:join', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim(), color, piece, clientToken: getClientToken() })
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🏫</div>
          <h1 className={styles.title}>Remigianum</h1>
          <h2 className={styles.subtitle}>Monopoly</h2>
          <div className={styles.divider} />
        </div>

        {connectionStatus !== 'connected' && (
          <div className={styles.connecting}>
            <div className={styles.connectSpinner} />
            <div>
              <div>Verbinde mit Server... ({connectSeconds}s)</div>
              {connectSeconds > 10 && (
                <div className={styles.connectHint}>
                  Server startet gerade — kann bis zu 60s dauern ☕
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'choose' ? (
          <div className={styles.buttons}>
            <button className={styles.btnPrimary} onClick={() => setMode('create')}>
              🎮 Neues Spiel erstellen
            </button>
            <button className={styles.btnSecondary} onClick={() => setMode('join')}>
              🚪 Spiel beitreten
            </button>
          </div>
        ) : (
          <div className={styles.form}>
            <button className={styles.back} onClick={() => { setMode('choose'); setError(null); setTakenPieces([]); setTakenColors([]) }}>← Zurück</button>

            <label className={styles.label}>Dein Name</label>
            <input
              className={styles.input}
              placeholder="Name eingeben..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={16}
            />

            {mode === 'join' && (
              <>
                <label className={styles.label}>Raum-Code</label>
                <input
                  className={styles.input}
                  placeholder="z.B. ABCD12"
                  value={roomCode}
                  onChange={e => handleRoomCodeChange(e.target.value)}
                  maxLength={6}
                />
              </>
            )}

            <label className={styles.label}>Spielfigur</label>
            <div className={styles.pieceGrid}>
              {PIECES.map(p => {
                const taken = mode === 'join' && takenPieces.includes(p)
                return (
                  <button
                    key={p}
                    className={`${styles.pieceBtn} ${piece === p ? styles.selected : ''} ${taken ? styles.taken : ''}`}
                    onClick={() => !taken && setPiece(p)}
                    title={taken ? `${p} – bereits vergeben` : p}
                    disabled={taken}
                  >
                    <span className={styles.pieceEmoji}>{PIECE_LABELS[p]}</span>
                    <span>{taken ? '✗' : p}</span>
                  </button>
                )
              })}
            </div>

            <label className={styles.label}>Farbe</label>
            <div className={styles.colorRow}>
              {COLORS.map(c => {
                const taken = mode === 'join' && takenColors.includes(c)
                return (
                  <button
                    key={c}
                    className={`${styles.colorBtn} ${color === c ? styles.selected : ''} ${taken ? styles.taken : ''}`}
                    style={{ background: PLAYER_COLORS[c], opacity: taken ? 0.35 : 1 }}
                    onClick={() => !taken && setColor(c)}
                    title={taken ? `${c} – bereits vergeben` : c}
                    disabled={taken}
                  />
                )
              })}
            </div>

            {errorMessage && <p className={styles.error}>{errorMessage}</p>}

            <button
              className={styles.btnPrimary}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={connectionStatus !== 'connected'}
            >
              {mode === 'create' ? '🎮 Raum erstellen' : '🚪 Beitreten'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
