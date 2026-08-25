const { Stock } = require('../models');

/** Metres covered by one piece. Falls back to 1 so piece-only products still work. */
function metersPerPiece(product) {
  const mpp = parseFloat(product && product.meters_per_piece);
  return isFinite(mpp) && mpp > 0 ? mpp : 1;
}

/** Round to 2dp to keep decimal arithmetic stable across many small mutations. */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function piecesFromMeters(meters, product) {
  return round2((Number(meters) || 0) / metersPerPiece(product));
}

function metersFromPieces(pieces, product) {
  return round2((Number(pieces) || 0) * metersPerPiece(product));
}

/**
 * Value of a stock position, derived from metres.
 * Per-metre price = piece price / metres per piece, so a partially sold
 * carpet is valued by what is physically left rather than by piece count.
 */
function valueOf(meterQuantity, product) {
  const mpp = metersPerPiece(product);
  const meters = Number(meterQuantity) || 0;
  return {
    meters: round2(meters),
    pieces: round2(meters / mpp),
    cost: round2(meters * (parseFloat(product.cost_price) / mpp)),
    sell: round2(meters * (parseFloat(product.sell_price) / mpp)),
  };
}

/**
 * Apply a metre delta to a warehouse/product stock row and keep the piece
 * count in step. Returns the updated row.
 * Throws if the delta would drive the position negative.
 */
async function applyStockDelta({ warehouseId, productId, meterDelta, product, transaction }) {
  const [row] = await Stock.findOrCreate({
    where: { warehouse_id: warehouseId, product_id: productId },
    defaults: { quantity: 0, meter_quantity: 0 },
    transaction,
  });

  const current = parseFloat(row.meter_quantity) || 0;
  const next = round2(current + Number(meterDelta));

  if (next < 0) {
    const err = new Error('INSUFFICIENT_STOCK');
    err.code = 'INSUFFICIENT_STOCK';
    err.available = current;
    throw err;
  }

  await row.update({
    meter_quantity: next,
    quantity: piecesFromMeters(next, product),
  }, { transaction });

  return row;
}

/** Parse a size label like "4x6m" or "2 x 3" into square metres. Returns null if unparseable. */
function metersFromSize(size) {
  if (!size) return null;
  const m = String(size).toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*[x*х]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const val = parseFloat(m[1]) * parseFloat(m[2]);
  return isFinite(val) && val > 0 ? round2(val) : null;
}

module.exports = {
  metersPerPiece,
  piecesFromMeters,
  metersFromPieces,
  valueOf,
  applyStockDelta,
  metersFromSize,
  round2,
};
