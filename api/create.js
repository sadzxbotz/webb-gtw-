import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username, packageRam, chatid } = req.body;

  const PANEL_DOMAIN = process.env.PANEL_DOMAIN;
  const ADMIN_API = process.env.ADMIN_API;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

  if (!username || !packageRam || !chatid) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  const email = username + "@kayxze.com";
  const password = Math.random().toString(36).slice(-10);

  // ================= RAM SYSTEM =================
  const ramMap = {
    "1GB": 1024,
    "2GB": 2048,
    "3GB": 3072,
    "4GB": 4096,
    "5GB": 5120,
    "6GB": 6144,
    "7GB": 7168,
    "8GB": 8192,
    "UNLIMITED": 0
  };

  const ram = ramMap[packageRam];
  if (ram === undefined) {
    return res.status(400).json({ error: "Paket tidak valid" });
  }

  try {

    // ================= CEK DUPLICATE USER =================
    const existingUsers = await axios.get(
      `${PANEL_DOMAIN}/api/application/users?filter[username]=${username}`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    if (existingUsers.data.data.length > 0) {
      return res.status(400).json({ error: "Username sudah ada" });
    }

    // ================= CREATE USER =================
    const user = await axios.post(
      `${PANEL_DOMAIN}/api/application/users`,
      {
        email,
        username,
        first_name: username,
        last_name: "User",
        password
      },
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    const userId = user.data.attributes.id;

    // ================= CREATE SERVER =================
    await axios.post(
      `${PANEL_DOMAIN}/api/application/servers`,
      {
        name: username + " Server",
        user: userId,
        egg: 1,
        docker_image: "ghcr.io/pterodactyl/yolks:nodejs_18",
        startup: "npm start",
        environment: {},
        limits: {
          memory: ram,
          swap: 0,
          disk: ram,
          io: 500,
          cpu: packageRam === "UNLIMITED" ? 200 : 100
        },
        feature_limits: {
          databases: 1,
          backups: 1,
          allocations: 1
        },
        deploy: {
          locations: [1],
          dedicated_ip: false,
          port_range: []
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    // ================= SEND TELEGRAM =================
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatid,
        text:
`AKUN PANEL BERHASIL DIBUAT

Username: ${username}
Password: ${password}
Email: ${email}
RAM: ${packageRam}
Login: ${PANEL_DOMAIN}`
      }
    );

    return res.status(200).json({ status: "SUCCESS" });

  } catch (err) {
    return res.status(500).json({
      status: "ERROR",
      error: err.response?.data || err.message
    });
  }
}
