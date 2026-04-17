const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Query parameter "url" required' });

  try {
    const komik = new Komik();
    const result = await komik.chapter(url);
    
    if (!result.status) {
      return res.status(404).json({ error: result.error || 'Gambar tidak ditemukan atau chapter terkunci.' });
    }

    if (!result.images || result.images.length === 0) {
      return res.status(404).json({ error: 'Gambar tidak ditemukan atau chapter terkunci.' });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.json({ images: result.images });
  } catch (err) {
    console.error('Chapter error:', err.message);
    res.status(500).json({ error: 'Failed to fetch chapter images', message: err.message });
  }
};
