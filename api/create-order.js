// ============================================================================
// STONIVE - Backend API Draft Order
// VERSIONE: 2.0.0 — Supporto multi-prodotto (array lineItems)
// ============================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin, lineItems } = req.body;

  if (pin !== process.env.UNLOCK_PIN) {
    return res.status(401).json({ error: 'PIN non valido' });
  }

  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'Nessun prodotto' });
  }

  const shopifyUrl = `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/draft_orders.json`;

  // Costruisce le line items per il Draft Order
  const draftLineItems = lineItems.map(function(item) {
    return {
      title: `Su Misura (${item.width}×${item.length}×${item.thickness} cm)`,
      price: item.price,
      quantity: item.qty,
      requires_shipping: true,
      taxable: true,
      properties: [
        { name: 'Larghezza (cm)', value: item.width },
        { name: 'Lunghezza (cm)', value: item.length },
        { name: 'Spessore (cm)',  value: item.thickness },
        { name: 'Riferimento',   value: item.sku },
        { name: 'PIN consulenza', value: pin }
      ]
    };
  });

  // Nota dell'ordine con tutti gli SKU
  const skuList = lineItems.map(i => i.sku).join(', ');

  const draftOrder = {
    draft_order: {
      line_items: draftLineItems,
      note: `Ordine su misura - ${skuList}`,
      tags: 'su-misura, consulenza-telefonica'
    }
  };

  try {
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
      },
      body: JSON.stringify(draftOrder)
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.errors || 'Errore Shopify');

    res.status(200).json({
      success: true,
      invoice_url: data.draft_order.invoice_url,
      order_id:    data.draft_order.id,
      order_name:  data.draft_order.name
    });

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore creazione ordine' });
  }
}
