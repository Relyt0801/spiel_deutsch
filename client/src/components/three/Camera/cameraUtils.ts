// Board layout: 40 squares around a perimeter
// Index 0 = bottom-right corner (Go), goes counter-clockwise when viewed from above
// Coordinate system: XZ plane (Y is up)

const BOARD_HALF = 5.0  // half of 10 units
const CORNER = 1.5
const NORMAL = 1.0

// Precompute all 40 square center positions
export function getSquareWorldPosition(index: number): [number, number, number] {
  const positions: [number, number, number][] = new Array(40)

  // Bottom row: indices 0-9 (right to left, z = +BOARD_HALF)
  // Corner 0 at right end, corner 10 at left end
  const bottomZ = BOARD_HALF
  // Corner 0 center:
  const corner0X = BOARD_HALF - CORNER / 2
  positions[0] = [corner0X, 0, bottomZ]
  // Squares 1-9 (left of corner 0):
  for (let i = 1; i <= 9; i++) {
    const x = corner0X - CORNER / 2 - NORMAL * (i - 1) - NORMAL / 2
    positions[i] = [x, 0, bottomZ]
  }

  // Left column: indices 10-19 (bottom to top, x = -BOARD_HALF)
  const leftX = -BOARD_HALF
  const corner10Z = BOARD_HALF - CORNER / 2
  positions[10] = [leftX + CORNER / 2, 0, corner10Z]
  // Hack: use left edge center X more accurately:
  positions[10] = [-BOARD_HALF + CORNER / 2, 0, BOARD_HALF - CORNER / 2]
  for (let i = 11; i <= 19; i++) {
    const z = (BOARD_HALF - CORNER) - NORMAL * (i - 11) - NORMAL / 2
    positions[i] = [leftX + CORNER / 2, 0, z]
  }

  // Top row: indices 20-29 (left to right, z = -BOARD_HALF)
  const topZ = -BOARD_HALF
  positions[20] = [-BOARD_HALF + CORNER / 2, 0, topZ + CORNER / 2]
  for (let i = 21; i <= 29; i++) {
    const x = -BOARD_HALF + CORNER + NORMAL * (i - 21) + NORMAL / 2
    positions[i] = [x, 0, topZ + CORNER / 2]
  }

  // Right column: indices 30-39 (top to bottom, x = +BOARD_HALF)
  const rightX = BOARD_HALF
  positions[30] = [rightX - CORNER / 2, 0, -BOARD_HALF + CORNER / 2]
  for (let i = 31; i <= 39; i++) {
    const z = -BOARD_HALF + CORNER + NORMAL * (i - 31) + NORMAL / 2
    positions[i] = [rightX - CORNER / 2, 0, z]
  }

  return positions[index] || [0, 0, 0]
}

export function getCameraPositionForSquare(index: number): {
  position: [number, number, number]
  lookAt: [number, number, number]
} {
  const [sx, , sz] = getSquareWorldPosition(index)

  // Determine which side of the board the square is on
  let camX = sx
  let camZ = sz
  const height = 5

  if (index >= 1 && index <= 9) {
    // Bottom row – camera from below (+Z side)
    camZ = sz + 4
    camX = sx
  } else if (index >= 11 && index <= 19) {
    // Left column – camera from left (-X side)
    camX = sx - 4
    camZ = sz
  } else if (index >= 21 && index <= 29) {
    // Top row – camera from above (-Z side)
    camZ = sz - 4
    camX = sx
  } else if (index >= 31 && index <= 39) {
    // Right column – camera from right (+X side)
    camX = sx + 4
    camZ = sz
  } else {
    // Corners
    camX = sx + (sx > 0 ? 3 : -3)
    camZ = sz + (sz > 0 ? 3 : -3)
  }

  return {
    position: [camX, height, camZ],
    lookAt: [sx, 0, sz],
  }
}

export const OVERVIEW_CAMERA = {
  position: [0, 14, 9] as [number, number, number],
  lookAt: [0, 0, 0] as [number, number, number],
}

export const DICE_CAMERA = {
  position: [0, 7, 5] as [number, number, number],
  lookAt: [0, 0, 0] as [number, number, number],
}
