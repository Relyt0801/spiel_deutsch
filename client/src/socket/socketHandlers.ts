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

  socket.on('room:lobby-update', ({ lobbyPlayers, allReady }) => {
    useGameStore.getState().setLobbyPlayers(lobbyPlayers)
    useGameStore.getState().setLobbyAllReady(allReady)
  })

  socket.on('room:kicked', () => {
    useUiStore.getState().setAppPhase('menu')
    useUiStore.getState().setError('Du wurdest vom Admin aus dem Raum entfernt.')
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
    // Close property modal when: phase leaves 'buying', OR it IS 'buying' but for another player
    const myId = useSocketStore.getState().myPlayerId
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    const isMyTurn = currentPlayer?.id === myId
    if (useUiStore.getState().activeModal === 'property' && (gameState.gamePhase !== 'buying' || !isMyTurn)) {
      useUiStore.getState().closeModal()
    }
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
    const myId = useSocketStore.getState().myPlayerId
    const currentPlayer = data.gameState.players[data.gameState.currentPlayerIndex]
    const isMyTurn = currentPlayer?.id === myId
    // Open modal only when I have a decision or I'm directly involved in rent
    if ((data.canBuy && isMyTurn) || (data.rentDue !== null && (isMyTurn || data.ownerId === myId))) {
      setTimeout(() => useUiStore.getState().openModal('property', data), 650)
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
    const myId = useSocketStore.getState().myPlayerId
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    const isMyTurn = currentPlayer?.id === myId
    // Show to everyone; CardModal auto-dismisses for observers
    setTimeout(() => useUiStore.getState().openModal('card', { card, cardType, isMyTurn }), 650)
  })

  // ─── AUCTION EVENTS ────────────────────────────────────────────────
  socket.on('auction:started', ({ gameState }) => {
    useGameStore.getState().setGameState(gameState)
    setTimeout(() => useUiStore.getState().openModal('auction'), 650)
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
    if (gameState) useGameStore.getState().setGameState(gameState)
    useUiStore.getState().closeModal()
  })

  socket.on('trade:countered', ({ trade }) => {
    const gs = useGameStore.getState().gameState
    if (gs) useGameStore.getState().setGameState({ ...gs, activeTrade: trade })
    useUiStore.getState().openModal('trade', { trade })
  })

  socket.on('trade:confirm-update', ({ trade }) => {
    const gs = useGameStore.getState().gameState
    if (gs) useGameStore.getState().setGameState({ ...gs, activeTrade: trade })
    if (useUiStore.getState().activeModal !== 'trade') {
      useUiStore.getState().openModal('trade', { trade })
    }
  })

  socket.on('trade:rejected', ({ trade, byId }) => {
    const gs = useGameStore.getState().gameState
    useUiStore.getState().closeModal()
    if (gs && trade) {
      const cancellerId = byId ?? trade.toPlayerId
      const canceller = gs.players.find((p: { id: string; name: string }) => p.id === cancellerId)
      if (canceller) {
        useUiStore.getState().setError(`${canceller.name} hat den Tausch abgebrochen.`)
        setTimeout(() => useUiStore.getState().setError(null), 3500)
      }
    }
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
