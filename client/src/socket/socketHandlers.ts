import { getSocket } from './socketClient'
import { useGameStore } from '../store/gameStore'
import { useSocketStore } from '../store/socketStore'
import { useUiStore } from '../store/uiStore'

export function registerSocketHandlers(): void {
  const socket = getSocket()

  socket.on('connect', () => {
    useSocketStore.getState().setConnectionStatus('connected')
    useSocketStore.getState().setMyPlayerId(socket.id || null)
  })

  socket.on('disconnect', () => {
    useSocketStore.getState().setConnectionStatus('disconnected')
  })

  socket.on('connect_error', () => {
    useSocketStore.getState().setConnectionStatus('disconnected')
  })

  // ─── ROOM EVENTS ───────────────────────────────────────────────────
  socket.on('room:created', ({ roomCode, gameState, lobbyPlayers }) => {
    useSocketStore.getState().setRoomCode(roomCode)
    useSocketStore.getState().setIsHost(true)
    if (gameState) useGameStore.getState().setGameState(gameState)
    if (lobbyPlayers) useGameStore.getState().setLobbyPlayers(lobbyPlayers)
    useUiStore.getState().setAppPhase('lobby')
  })

  socket.on('room:joined', ({ gameState, lobbyPlayers }) => {
    useSocketStore.getState().setIsHost(false)
    if (gameState) useGameStore.getState().setGameState(gameState)
    if (lobbyPlayers) useGameStore.getState().setLobbyPlayers(lobbyPlayers)
    useUiStore.getState().setAppPhase('lobby')
  })

  socket.on('room:error', ({ message }) => {
    useUiStore.getState().setError(message)
  })

  socket.on('room:player-joined', ({ player, gameState }) => {
    if (player) useGameStore.getState().addLobbyPlayer(player)
    if (gameState) useGameStore.getState().setGameState(gameState)
  })

  socket.on('room:player-left', ({ playerId, gameState }) => {
    useGameStore.getState().removeLobbyPlayer(playerId)
    if (gameState) useGameStore.getState().setGameState(gameState)
  })

  socket.on('room:game-started', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().setAppPhase('game')
    useUiStore.getState().setCameraTarget(null) // show full overview at game start
  })

  // ─── GAME STATE ────────────────────────────────────────────────────
  let prevPhase: string | null = null

  socket.on('game:state-update', ({ gameState }) => {
    // Reset camera to overview at start of each new turn
    if (gameState.gamePhase === 'rolling' && prevPhase !== 'rolling') {
      useUiStore.getState().setCameraTarget(null)
    }
    prevPhase = gameState.gamePhase
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:dice-rolled', ({ roll, gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().setDiceAnimating(true)
  })

  socket.on('game:piece-move-step', ({ toIndex, stepNumber, totalSteps }) => {
    useUiStore.getState().setIsAnimating(true)
    if (stepNumber === totalSteps) {
      // Final square: start smooth camera zoom now so it arrives as the piece lands
      useUiStore.getState().setCameraTarget(toIndex)
      setTimeout(() => {
        useUiStore.getState().setIsAnimating(false)
        socket.emit('game:movement-complete')
      }, 400)
    }
  })

  // ─── LANDING EVENTS ────────────────────────────────────────────────
  socket.on('game:landed-property', (data) => {
    useGameStore.getState().setGameState(data.gameState)
    if (data.canBuy || data.rentDue !== null) {
      useUiStore.getState().openModal('property', data)
    }
  })

  socket.on('game:landed-go', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:landed-tax', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:landed-jail-visit', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:landed-free-parking', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:go-to-jail', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().setCameraTarget(10)
  })

  socket.on('game:card-drawn', ({ card, cardType, gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().openModal('card', { card, cardType })
  })

  // ─── AUCTION EVENTS ────────────────────────────────────────────────
  socket.on('auction:started', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().openModal('auction')
  })

  socket.on('auction:bid-placed', ({ auction }) => {
    const gs = useGameStore.getState().gameState
    if (gs) useGameStore.getState().setGameState({ ...gs, auction })
  })

  socket.on('auction:ended', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().closeModal()
  })

  socket.on('auction:tick', ({ timeRemaining }) => {
    const gs = useGameStore.getState().gameState
    if (gs?.auction) {
      useGameStore.getState().setGameState({ ...gs, auction: { ...gs.auction, timeRemaining } })
    }
  })

  // ─── TRADE EVENTS ──────────────────────────────────────────────────
  socket.on('trade:proposed', ({ trade }) => {
    const gs = useGameStore.getState().gameState
    if (gs) useGameStore.getState().setGameState({ ...gs, activeTrade: trade })
    useUiStore.getState().openModal('trade', { trade })
  })

  socket.on('trade:accepted', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().closeModal()
  })

  socket.on('trade:rejected', () => {
    useUiStore.getState().closeModal()
  })

  // ─── END GAME ──────────────────────────────────────────────────────
  socket.on('game:player-bankrupt', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
  })

  socket.on('game:over', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    useUiStore.getState().openModal('winner')
  })

  socket.on('game:error', ({ message }) => {
    useUiStore.getState().setError(message)
  })
}
