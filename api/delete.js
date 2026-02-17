import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username, secret } = req.body;

  const PANEL_DOMAIN = process.env.PANEL_DOMAIN;
  const ADMIN_API = process.env.ADMIN_API;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized - Admin Only" });
  }

  if (!username) {
    return res.status(400).json({ error: "Username wajib diisi" });
  }

  try {

    const userSearch = await axios.get(
      `${PANEL_DOMAIN}/api/application/users?filter[username]=${username}`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    if (userSearch.data.data.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const userId = userSearch.data.data[0].attributes.id;

    const servers = await axios.get(
      `${PANEL_DOMAIN}/api/application/servers?filter[user]=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    for (const srv of servers.data.data) {
      await axios.delete(
        `${PANEL_DOMAIN}/api/application/servers/${srv.attributes.id}`,
        {
          headers: {
            Authorization: `Bearer ${ADMIN_API}`,
            Accept: "Application/vnd.pterodactyl.v1+json"
          }
        }
      );
    }

    await axios.delete(
      `${PANEL_DOMAIN}/api/application/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API}`,
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    return res.status(200).json({ status: "USER_DELETED_SUCCESS" });

  } catch (err) {
    return res.status(500).json({
      status: "ERROR",
      error: err.response?.data || err.message
    });
  }
}
