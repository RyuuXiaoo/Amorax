
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const ATLAN_API_KEY = 'dNDxxF95ALgKRLMD7ExcHnBYHMZgoWg9B0RrwidpmoqRpOWjjXhmlTXP7pqzbDSznihEPRmDjqMSnhzvCgcGrKodHU1XSyZP8QSD';
const BASE_URL = 'https://atlantich2h.com';
const UNTUNG_PERSEN = 10;

function generateReffId() {
    return uuidv4().replace(/-/g, '').substring(0, 16);
}

function toRupiah(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calculateFinalPrice(price) {
    const profit = (UNTUNG_PERSEN / 100) * price;
    return Number(price) + Number(Math.ceil(profit));
}

app.get('/api/products', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const products = data.data.map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            return {
                code: i.code,
                name: i.name,
                provider: i.provider,
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: i.status,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: products,
            message: 'Data produk berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/check-product', async (req, res) => {
    try {
        const { code } = req.body;
        
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;
        
        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance'
            });
        }

        const product = data.data.find(item => item.code === code);
        
        if (!product) {
            return res.json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }

        const finalPrice = calculateFinalPrice(product.price);
        
        res.json({
            success: true,
            data: {
                code: product.code,
                name: product.name,
                provider: product.provider,
                original_price: Number(product.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: product.status
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/deposit/create', async (req, res) => {
    try {
        const { nominal } = req.body;
        const reff_id = generateReffId();

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("reff_id", reff_id);
        params.append("nominal", nominal);
        params.append("type", "ewallet");
        params.append("metode", "qrisfast");

        const response = await axios.post(`${BASE_URL}/deposit/create`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/deposit/status', async (req, res) => {
    try {
        const { id } = req.body;

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("id", id);

        const response = await axios.post(`${BASE_URL}/deposit/status`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/deposit/cancel', async (req, res) => {
    try {
        const { id } = req.body;

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("id", id);

        const response = await axios.post(`${BASE_URL}/deposit/cancel`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/order/create', async (req, res) => {
    try {
        const { code, target } = req.body;
        const reff_id = generateReffId();

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("code", code);
        params.append("reff_id", reff_id);
        params.append("target", target);

        const response = await axios.post(`${BASE_URL}/transaksi/create`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/order/create', async (req, res) => {
    try {
        const { code, target } = req.query;
        const reff_id = generateReffId();

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("code", code);
        params.append("reff_id", reff_id);
        params.append("target", target);

        const response = await axios.post(`${BASE_URL}/transaksi/create`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.post('/api/order/status', async (req, res) => {
    try {
        const { id } = req.body;

        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("id", id);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/transaksi/status`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/dana', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const danaProducts = data.data.filter(i => i.provider === "DANA").map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            // Return semua properti dari objek i plus tambahan yang dihitung
            return {
                ...i, // Spread operator untuk mengambil semua properti yang ada
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: danaProducts,
            message: 'Data produk DANA berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/ovo', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const danaProducts = data.data.filter(i => i.provider === "OVO").map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            return {
                code: i.code,
                name: i.name,
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: i.status,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: danaProducts,
            message: 'Data produk OVO berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/gopay', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const danaProducts = data.data.filter(i => i.provider === "GO PAY").map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            return {
                code: i.code,
                name: i.name,
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: i.status,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: danaProducts,
            message: 'Data produk Gopay berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/freefire', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const danaProducts = data.data.filter(i => i.provider === "FREE FIRE").map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            return {
                code: i.code,
                name: i.name,
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: i.status,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: danaProducts,
            message: 'Data produk Free Fire berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get('/api/mobilelegend', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("api_key", ATLAN_API_KEY);
        params.append("type", "prabayar");

        const response = await axios.post(`${BASE_URL}/layanan/price_list`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (!data.status) {
            return res.status(500).json({
                success: false,
                message: 'Server maintenance',
                maintenance: true,
                ip_message: data.message.replace(/[^0-9.]+/g, '')
            });
        }

        const regeXcomp = (a, b) => {
            const aPrice = Number(a.price.replace(/[^0-9.-]+/g, ""));
            const bPrice = Number(b.price.replace(/[^0-9.-]+/g, ""));
            return aPrice - bPrice;
        };

        data.data.sort(regeXcomp);
        const danaProducts = data.data.filter(i => i.provider === "MOBILE LEGENDS").map(i => {
            const finalPrice = calculateFinalPrice(i.price);
            
            return {
                code: i.code,
                name: i.name,
                original_price: Number(i.price),
                final_price: finalPrice,
                price_formatted: `Rp ${toRupiah(finalPrice)}`,
                status: i.status,
                status_emoji: i.status === "available" ? "✅" : "❎"
            };
        });

        res.json({
            success: true,
            data: danaProducts,
            message: 'Data produk Mobile Legend berhasil didapatkan'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
});

app.get("/api/chat", async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) {
            return res.status(400).json({ error: "Text parameter is required" });
        }
        const response = await axios.get(`https://api.im-rerezz.xyz/api/openai/lumina?text=${encodeURIComponent(text)}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch response", details: error.message });
    }
});

const VIP_RESELLER_CONFIG = {
    API_ID: 'Wb3amvEX',
    API_KEY: 'gq2NOMP3DM0sp7CLdg9OnguG9hTajNnejJJktPK5wx6AR3OQzUHKIv2eqKNvuDzI',
    BASE_URL: 'https://vip-reseller.co.id/api',
  };
  
  function generateSign(apiId, apiKey) {
    return crypto.createHash('md5').update(apiId + apiKey).digest('hex');
  }
  
  app.get('/api/vipreseller/profile', async (req, res) => {
    try {
      const sign = generateSign(VIP_RESELLER_CONFIG.API_ID, VIP_RESELLER_CONFIG.API_KEY);
      
      const response = await axios.post(`${VIP_RESELLER_CONFIG.BASE_URL}/profile`, {
        key: VIP_RESELLER_CONFIG.API_KEY,
        sign: sign
      });
  
      // Jika sukses, kembalikan response asli dari API
      res.json(response.data);
      
    } catch (error) {
      console.error('Error:', error.message);
      
      // Jika ada response dari server VIP Reseller
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } 
      // Jika error tanpa response (connection error, etc)
      else {
        res.status(500).json({
          success: false,
          message: "Gagal menghubungi server VIP Reseller",
          error: error.message
        });
      }
    }
  });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ewalet/dana', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ewalet', 'dana.html'));
});
app.get('/ewalet/gopay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ewalet', 'gopay.html'));
});
app.get('/game/free-fire', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game', 'free-fire.html'));
});
app.get('/game/mobilelegend', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game', 'ml.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
