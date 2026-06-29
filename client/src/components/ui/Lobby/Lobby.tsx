import { useState } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { useUiStore } from '../../../store/uiStore'
import { getSocket } from '../../../socket/socketClient'
import { clearSavedRoom } from '../../../socket/session'
import { PLAYER_COLORS } from '../../../types/game'
import type { BankruptcyMode, GameSettings } from '../../../types/game'
import styles from './Lobby.module.css'

const BANKRUPTCY_OPTIONS: Array<{ value: BankruptcyMode; label: string; desc: string }> = [
  { value: 'auction', label: '🔨 Versteigerung', desc: 'Offizielle Regeln: Grundstücke werden versteigert' },
  { value: 'creditorAll', label: '📦 Alles an Gläubiger', desc: 'Geld & Grundstücke gehen an den Spieler' },
  { value: 'creditorMoney', label: '💶 Nur Geld an Gläubiger', desc: 'Geld an den Spieler, Grundstücke werden frei' },
  { value: 'release', label: '♻️ Besitz freigeben', desc: 'Alles geht zurück an die Bank' },
]

export function Lobby() {
  const lobbyPlayers = useGameStore(s => s.lobbyPlayers)
  const lobbyAllReady = useGameStore(s => s.lobbyAllReady)
  const lobbySettings = useGameStore(s => s.lobbySettings)
  const gameState = useGameStore(s => s.gameState)
  const roomCode = useSocketStore(s => s.roomCode)
  const isHost = useSocketStore(s => s.isHost)
  const myId = useSocketStore(s => s.myPlayerId)

  const [showSettings, setShowSettings] = useState(false)
  const [showBankruptcyList, setShowBankruptcyList] = useState(false)

  const updateSettings = (patch: Partial<GameSettings>) =>
    getSocket().emit('room:update-settings', { settings: patch })
  const currentBankruptcy = BANKRUPTCY_OPTIONS.find(o => o.value === lobbySettings.bankruptcyMode) ?? BANKRUPTCY_OPTIONS[0]

  const allPlayers = gameState?.players.length ? gameState.players : lobbyPlayers
  const me = lobbyPlayers.find(p => p.id === myId)
  const amIReady = me?.isReady ?? false
  const canStart = lobbyAllReady && allPlayers.length >= 1

  const nonHostHumans = lobbyPlayers.filter(p => !p.isBot && p.id !== myId)
  const readyNonHostHumans = nonHostHumans.filter(p => p.isReady)

  const handleStart = () => getSocket().emit('room:start-game')
  const handleToggleReady = () => getSocket().emit('room:toggle-ready')
  const handleAddBot = () => getSocket().emit('room:add-bot')
  const handleKick = (playerId: string) => getSocket().emit('room:kick-player', { playerId })
  const handleLeave = () => {
    getSocket().emit('room:leave')
    clearSavedRoom()
    useGameStore.getState().clearGame()
    useUiStore.getState().setAppPhase('menu')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🏫 Remigianum Monopoly</h1>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>Raum-Code</span>
            <span
              className={styles.code}
              title="Klicken zum Kopieren"
              onClick={() => {
                if (roomCode) navigator.clipboard?.writeText(roomCode).catch(() => {})
                useUiStore.getState().setNotice('📋 Raum-Code kopiert!')
                setTimeout(() => useUiStore.getState().setNotice(null), 2000)
              }}
            >{roomCode}</span>
            <span className={styles.codeHint}>Tippe den Code zum Kopieren · teile ihn mit Mitspielern</span>
          </div>
        </div>

        <div className={styles.playerList}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Spieler ({allPlayers.length}/6)</h3>
            {isHost && nonHostHumans.length > 0 && (
              <span className={styles.readyCount}>
                {readyNonHostHumans.length}/{nonHostHumans.length} bereit
              </span>
            )}
          </div>

          {allPlayers.map(p => {
            const color = PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] ?? '#999'
            const isBot = (p as any).isBot ?? false
            const isReady = (p as any).isReady ?? false
            const isDisconnected = (p as any).disconnected ?? false
            const isMe = p.id === myId
            const isHostPlayer = isHost && isMe || gameState?.hostId === p.id

            return (
              <div key={p.id} className={`${styles.playerRow} ${isMe ? styles.playerRowMe : ''} ${isDisconnected ? styles.playerRowOffline : ''}`}>
                <div className={styles.colorDot} style={{ background: color }} />
                <span className={styles.playerName}>
                  {p.name}
                  {isMe && <span className={styles.you}> (Du)</span>}
                </span>
                {isDisconnected && <span className={styles.offlineBadge}>🔌 wieder verbinden…</span>}
                {isHostPlayer && <span className={styles.hostBadge}>👑</span>}
                {isBot
                  ? <span className={styles.botBadge}>🤖</span>
                  : isHostPlayer
                    ? <span className={styles.adminBadge}>Admin</span>
                    : <span className={`${styles.readyBadge} ${isReady ? styles.readyYes : styles.readyNo}`}>
                        {isReady ? '✓' : '○'}
                      </span>
                }
                {isHost && !isMe && (
                  <button className={styles.kickBtn} onClick={() => handleKick(p.id)}>✕</button>
                )}
              </div>
            )
          })}

          {allPlayers.length < 6 && (
            <div className={styles.waiting}>⏳ Warte auf Mitspieler...</div>
          )}
        </div>

        {/* ── Spielmodifikatoren ── */}
        <div className={styles.settingsSection}>
          <button className={styles.settingsToggle} onClick={() => setShowSettings(v => !v)}>
            <span>⚙️ Spielmodifikatoren</span>
            <span>{showSettings ? '▲' : '▼'}</span>
          </button>

          {showSettings && (
            <div className={styles.settingsBody}>
              {isHost ? (
                <>
                  <label className={styles.settingRow}>
                    <span className={styles.settingText}>
                      <strong>Auf Los: doppeltes Geld</strong>
                      <small>Landen auf „Unterricht beginnt!“ gibt 400€ statt 200€</small>
                    </span>
                    <input type="checkbox" className={styles.switch}
                      checked={lobbySettings.goDoubleMoney}
                      onChange={e => updateSettings({ goDoubleMoney: e.target.checked })} />
                  </label>

                  <label className={styles.settingRow}>
                    <span className={styles.settingText}>
                      <strong>Mit Zeitbeschränkung spielen</strong>
                      <small>2 Min pro Wurf · jeder Handel bricht nach 1 Min ab (mit Timer)</small>
                    </span>
                    <input type="checkbox" className={styles.switch}
                      checked={lobbySettings.timeLimit}
                      onChange={e => updateSettings({ timeLimit: e.target.checked })} />
                  </label>

                  <div className={styles.settingRow}>
                    <span className={styles.settingText}>
                      <strong>Bei Bankrott …</strong>
                      <small>{currentBankruptcy.desc}</small>
                    </span>
                    <div className={styles.dropdownWrap}>
                      <button className={styles.dropdownBtn} onClick={() => setShowBankruptcyList(v => !v)}>
                        {currentBankruptcy.label} ▾
                      </button>
                      {showBankruptcyList && (
                        <div className={styles.dropdownList}>
                          {BANKRUPTCY_OPTIONS.map(o => (
                            <button key={o.value}
                              className={`${styles.dropdownItem} ${o.value === lobbySettings.bankruptcyMode ? styles.dropdownActive : ''}`}
                              onClick={() => { updateSettings({ bankruptcyMode: o.value }); setShowBankruptcyList(false) }}>
                              <span>{o.label}</span>
                              <small>{o.desc}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.settingsReadonly}>
                  <div>{lobbySettings.goDoubleMoney ? '✅' : '⬜'} Auf Los: doppeltes Geld</div>
                  <div>{lobbySettings.timeLimit ? '✅' : '⬜'} Zeitbeschränkung (2 Min / Wurf)</div>
                  <div>🏦 Bei Bankrott: {currentBankruptcy.label}</div>
                  <p className={styles.readonlyNote}>Nur der Admin kann die Modifikatoren ändern.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {isHost ? (
            <>
              {allPlayers.length < 6 && (
                <button className={styles.addBotBtn} onClick={handleAddBot}>
                  🤖 Bot hinzufügen
                </button>
              )}
              <button
                className={styles.startBtn}
                onClick={handleStart}
                disabled={!canStart}
              >
                🎮 Spiel starten
              </button>
              {!canStart && nonHostHumans.length > 0 && (
                <p className={styles.waitNote}>Warte bis alle Spieler bereit sind...</p>
              )}
              {nonHostHumans.length === 0 && (
                <p className={styles.waitNote}>Füge Bots oder Mitspieler hinzu</p>
              )}
            </>
          ) : (
            <>
              <button
                className={`${styles.readyBtn} ${amIReady ? styles.readyBtnActive : ''}`}
                onClick={handleToggleReady}
              >
                {amIReady ? '✓ Bereit!' : 'Bereit drücken'}
              </button>
              <p className={styles.waitNote}>
                {amIReady ? 'Warte auf den Host...' : 'Drücke Bereit wenn du spielbereit bist'}
              </p>
            </>
          )}
          <button className={styles.leaveBtn} onClick={handleLeave}>🚪 Raum verlassen</button>
        </div>
      </div>
    </div>
  )
}
