export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin, width, length, thickness, price } = req.body;

  if (pin !== process.env.UNLOCK_PIN) {
    return res.status(401).json({ error: 'PIN non valido' });
  }

  const w = String(width).padStart(3, '0');
  const l = String(length).padStart(3, '0');
  const h = String(thickness).padStart(2, '0');
  const sku = `SU-MISURA-W${w}-L${l}-H${h}`;

  const shopifyUrl = `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/draft_orders.json`;

  const draftOrder = {
    draft_order: {
      line_items: [
        {
          title: `Materasso Su Misura (${width}×${length}×${thickness} cm)`,
          price: price,
          quantity: 1,
          requires_shipping: true,
          taxable: true,
          properties: [
            { name: 'Larghezza (cm)', value: width },
            { name: 'Lunghezza (cm)', value: length },
            { name: 'Spessore (cm)', value: thickness },
            { name: 'Riferimento', value: sku },
            { name: 'PIN consulenza', value: pin }
          ]
        }
      ],
      note: `Ordine su misura - ${sku}`,
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

    if (!response.ok) {
      throw new Error(data.errors || 'Errore Shopify');
    }

    res.status(200).json({
      success: true,
      invoice_url: data.draft_order.invoice_url,
      order_id: data.draft_order.id,
      order_name: data.draft_order.name
    });

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore creazione ordine' });
  }
}
