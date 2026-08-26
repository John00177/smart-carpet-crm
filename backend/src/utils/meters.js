const { Stock } = require('../models');

/** Round to 2dp to keep decimal arithmetic stable across many small mutations. */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function isMeterType(product) {
  return !!product && product.unit_type === 'meter';
}

function isPieceType(product) {
  return !isMeterType(product);
}

/**
 * Value of a stock position. Reads whichever field applies to the
 * product's unit_type — the other field is always 0 for that row.
 */
function valueOf(stockRow, product) {
  const meter = isMeterType(product);
  const qty = meter ? (parseFloat(stockRow.meter_quantity) || 0) : (parseFloat(stockRow.quantity) || 0);
  return {
    quantity: meter ? 0 : Math.round(qty),
    meter_quantity: meter ? round2(qty) : 0,
    cost: round2(qty * parseFloat(product.cost_price)),
    sell: round2(qty * parseFloat(product.sell_price)),
  };
}

/**
 * Apply a delta (in the product's native unit) to a warehouse/product stock
 * row: pieces for a 'piece' product, metres for a 'meter' product.
 * Throws INSUFFICIENT_STOCK if the delta would drive the position negative.
 */
async function applyStockDelta({ warehouseId, productId, delta, product, transaction }) {
  const [row] = await Stock.findOrCreate({
    where: { warehouse_id: warehouseId, product_id: productId },
    defaults: { quantity: 0, meter_quantity: 0 },
    transaction,
  });

  if (isMeterType(product)) {
    const current = parseFloat(row.meter_quantity) || 0;
    const next = round2(current + Number(delta));
    if (next < 0) {
      const err = new Error('INSUFFICIENT_STOCK');
      err.code = 'INSUFFICIENT_STOCK';
      err.available = current;
      throw err;
    }
    await row.update({ meter_quantity: next }, { transaction });
  } else {
    const current = row.quantity || 0;
    const next = Math.round(current + Number(delta));
    if (next < 0) {
      const err = new Error('INSUFFICIENT_STOCK');
      err.code = 'INSUFFICIENT_STOCK';
      err.available = current;
      throw err;
    }
    await row.update({ quantity: next }, { transaction });
  }

  return row;
}

module.exports = {
  round2,
  isMeterType,
  isPieceType,
  valueOf,
  applyStockDelta,
};
