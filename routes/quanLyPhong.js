const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("./xacThuc");

// ======================================================
// CÃC HÃ€M KIá»‚M TRA Dá»® LIá»†U
// ======================================================

const ALLOWED_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "HOLD",
  "MAINTENANCE",
  "PROCESSING",
];

function isValidId(id) {
  return Number.isInteger(id) && id > 0;
}

async function checkRoomType(typeId) {
  const [rows] = await db.query(
    "SELECT room_type_id FROM room_types WHERE room_type_id = ?",
    [typeId],
  );

  return rows.length > 0;
}

// ======================================================
// UC-ROOM-01: Láº¤Y DANH SÃCH PHÃ’NG
// ======================================================

router.get("/", async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT
        r.room_id,
        r.room_code,
        r.room_number,
        r.room_type_id,
        rt.type_code,
        rt.type_name,
        r.area_m2,
        r.listed_rent,
        r.status,
        r.description
      FROM rooms r
      LEFT JOIN room_types rt
        ON r.room_type_id = rt.room_type_id
      ORDER BY r.room_id ASC
    `);

    return res.status(200).json({
      message: "Láº¥y danh sÃ¡ch phÃ²ng thÃ nh cÃ´ng.",
      total: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Lá»—i láº¥y danh sÃ¡ch phÃ²ng:", error);

    return res.status(500).json({
      message: "KhÃ´ng thá»ƒ láº¥y danh sÃ¡ch phÃ²ng.",
    });
  }
});

// ======================================================
// UC-ROOM-01: Láº¤Y CHI TIáº¾T PHÃ’NG
// ======================================================

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!isValidId(roomId)) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    const [rooms] = await db.query(
      `
      SELECT
        r.room_id,
        r.room_code,
        r.room_number,
        r.room_type_id,
        rt.type_code,
        rt.type_name,
        r.area_m2,
        r.listed_rent,
        r.status,
        r.description
      FROM rooms r
      LEFT JOIN room_types rt
        ON r.room_type_id = rt.room_type_id
      WHERE r.room_id = ?
      `,
      [roomId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        message: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng.",
      });
    }

    return res.status(200).json({
      message: "Láº¥y thÃ´ng tin phÃ²ng thÃ nh cÃ´ng.",
      data: rooms[0],
    });
  } catch (error) {
    console.error("Lá»—i láº¥y thÃ´ng tin phÃ²ng:", error);

    return res.status(500).json({
      message: "KhÃ´ng thá»ƒ láº¥y thÃ´ng tin phÃ²ng.",
    });
  }
});

// ======================================================
// UC-ROOM-02: THÃŠM PHÃ’NG
// ======================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      room_code,
      room_number,
      room_type_id,
      area_m2,
      listed_rent,
      description,
    } = req.body;

    // Kiá»ƒm tra dá»¯ liá»‡u báº¯t buá»™c
    if (
      !room_code ||
      !room_number ||
      room_type_id === undefined ||
      room_type_id === null ||
      room_type_id === "" ||
      listed_rent === undefined ||
      listed_rent === null ||
      listed_rent === ""
    ) {
      return res.status(400).json({
        message:
          "Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ mÃ£ phÃ²ng, sá»‘ phÃ²ng, loáº¡i phÃ²ng vÃ  giÃ¡ thuÃª.",
      });
    }

    const code = String(room_code).trim();
    const number = String(room_number).trim();
    const typeId = Number(room_type_id);
    const rent = Number(listed_rent);

    const area =
      area_m2 === "" || area_m2 === null || area_m2 === undefined
        ? null
        : Number(area_m2);

    if (!code || !number) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng vÃ  sá»‘ phÃ²ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.",
      });
    }

    if (!isValidId(typeId)) {
      return res.status(400).json({
        message: "Loáº¡i phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    if (!Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "GiÃ¡ thuÃª pháº£i lÃ  sá»‘ khÃ´ng Ã¢m.",
      });
    }

    if (area !== null && (!Number.isFinite(area) || area <= 0)) {
      return res.status(400).json({
        message: "Diá»‡n tÃ­ch pháº£i lá»›n hÆ¡n 0.",
      });
    }

    // Kiá»ƒm tra loáº¡i phÃ²ng tá»“n táº¡i
    const typeExists = await checkRoomType(typeId);

    if (!typeExists) {
      return res.status(400).json({
        message: "Loáº¡i phÃ²ng khÃ´ng tá»“n táº¡i.",
      });
    }

    // Kiá»ƒm tra trÃ¹ng mÃ£ phÃ²ng vÃ  sá»‘ phÃ²ng
    const [existingRooms] = await db.query(
      `
      SELECT room_id
      FROM rooms
      WHERE room_code = ? OR room_number = ?
      `,
      [code, number],
    );

    if (existingRooms.length > 0) {
      return res.status(409).json({
        message: "MÃ£ phÃ²ng hoáº·c sá»‘ phÃ²ng Ä‘Ã£ tá»“n táº¡i.",
      });
    }

    // ThÃªm phÃ²ng
    const [result] = await db.query(
      `
      INSERT INTO rooms
      (
        room_code,
        room_number,
        room_type_id,
        area_m2,
        listed_rent,
        status,
        description
      )
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?)
      `,
      [
        code,
        number,
        typeId,
        area,
        rent,
        description ? String(description).trim() : null,
      ],
    );

    return res.status(201).json({
      message: "ThÃªm phÃ²ng thÃ nh cÃ´ng.",
      room_id: result.insertId,
    });
  } catch (error) {
    console.error("Lá»—i thÃªm phÃ²ng:", error);

    return res.status(500).json({
      message: "KhÃ´ng thá»ƒ thÃªm phÃ²ng.",
    });
  }
});

// ======================================================
// UC-ROOM-03: Cáº¬P NHáº¬T THÃ”NG TIN PHÃ’NG
// ======================================================

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!isValidId(roomId)) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    const {
      room_code,
      room_number,
      room_type_id,
      area_m2,
      listed_rent,
      description,
    } = req.body;

    if (
      !room_code ||
      !room_number ||
      room_type_id === undefined ||
      room_type_id === null ||
      room_type_id === "" ||
      listed_rent === undefined ||
      listed_rent === null ||
      listed_rent === ""
    ) {
      return res.status(400).json({
        message: "Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.",
      });
    }

    const code = String(room_code).trim();
    const number = String(room_number).trim();
    const typeId = Number(room_type_id);
    const rent = Number(listed_rent);

    const area =
      area_m2 === "" || area_m2 === null || area_m2 === undefined
        ? null
        : Number(area_m2);

    if (!code || !number) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng vÃ  sá»‘ phÃ²ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.",
      });
    }

    if (!isValidId(typeId)) {
      return res.status(400).json({
        message: "Loáº¡i phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    if (!Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "GiÃ¡ thuÃª khÃ´ng há»£p lá»‡.",
      });
    }

    if (area !== null && (!Number.isFinite(area) || area <= 0)) {
      return res.status(400).json({
        message: "Diá»‡n tÃ­ch pháº£i lá»›n hÆ¡n 0.",
      });
    }

    // Kiá»ƒm tra phÃ²ng tá»“n táº¡i
    const [currentRooms] = await db.query(
      "SELECT room_id FROM rooms WHERE room_id = ?",
      [roomId],
    );

    if (currentRooms.length === 0) {
      return res.status(404).json({
        message: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng cáº§n sá»­a.",
      });
    }

    // Kiá»ƒm tra loáº¡i phÃ²ng tá»“n táº¡i
    const typeExists = await checkRoomType(typeId);

    if (!typeExists) {
      return res.status(400).json({
        message: "Loáº¡i phÃ²ng khÃ´ng tá»“n táº¡i.",
      });
    }

    // Kiá»ƒm tra trÃ¹ng mÃ£ vÃ  sá»‘ phÃ²ng
    const [existingRooms] = await db.query(
      `
      SELECT room_id
      FROM rooms
      WHERE (room_code = ? OR room_number = ?)
      AND room_id <> ?
      `,
      [code, number, roomId],
    );

    if (existingRooms.length > 0) {
      return res.status(409).json({
        message: "MÃ£ phÃ²ng hoáº·c sá»‘ phÃ²ng Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng.",
      });
    }

    await db.query(
      `
      UPDATE rooms
      SET
        room_code = ?,
        room_number = ?,
        room_type_id = ?,
        area_m2 = ?,
        listed_rent = ?,
        description = ?
      WHERE room_id = ?
      `,
      [
        code,
        number,
        typeId,
        area,
        rent,
        description ? String(description).trim() : null,
        roomId,
      ],
    );

    return res.status(200).json({
      message: "Cáº­p nháº­t thÃ´ng tin phÃ²ng thÃ nh cÃ´ng.",
      room_id: roomId,
    });
  } catch (error) {
    console.error("Lá»—i cáº­p nháº­t phÃ²ng:", error);

    return res.status(500).json({
      message: "KhÃ´ng thá»ƒ cáº­p nháº­t phÃ²ng.",
    });
  }
});

// ======================================================
// UC-ROOM-02: Cáº¬P NHáº¬T TRáº NG THÃI PHÃ’NG
// ======================================================

router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { status } = req.body;

    if (!isValidId(roomId)) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Tráº¡ng thÃ¡i phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    const [rooms] = await db.query(
      "SELECT room_id, status FROM rooms WHERE room_id = ?",
      [roomId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        message: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng.",
      });
    }

    // KhÃ´ng cho chuyá»ƒn phÃ²ng Ä‘ang thuÃª thÃ nh trá»‘ng tÃ¹y tiá»‡n
    if (rooms[0].status === "OCCUPIED" && status === "AVAILABLE") {
      return res.status(409).json({
        message:
          "KhÃ´ng thá»ƒ chuyá»ƒn phÃ²ng Ä‘ang cÃ³ ngÆ°á»i thuÃª thÃ nh phÃ²ng trá»‘ng trá»±c tiáº¿p.",
      });
    }

    await db.query("UPDATE rooms SET status = ? WHERE room_id = ?", [
      status,
      roomId,
    ]);

    return res.status(200).json({
      message: "Cáº­p nháº­t tráº¡ng thÃ¡i phÃ²ng thÃ nh cÃ´ng.",
      room_id: roomId,
      status,
    });
  } catch (error) {
    console.error("Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i phÃ²ng:", error);

    return res.status(500).json({
      message: "KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i phÃ²ng.",
    });
  }
});

// ======================================================
// XÃ“A PHÃ’NG
// ======================================================

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!isValidId(roomId)) {
      return res.status(400).json({
        message: "MÃ£ phÃ²ng khÃ´ng há»£p lá»‡.",
      });
    }

    const [rooms] = await db.query(
      "SELECT room_id, status FROM rooms WHERE room_id = ?",
      [roomId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        message: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng.",
      });
    }

    if (rooms[0].status === "OCCUPIED" || rooms[0].status === "HOLD") {
      return res.status(409).json({
        message: "KhÃ´ng thá»ƒ xÃ³a phÃ²ng Ä‘ang cÃ³ ngÆ°á»i thuÃª hoáº·c Ä‘ang Ä‘Æ°á»£c giá»¯.",
      });
    }

    await db.query("DELETE FROM rooms WHERE room_id = ?", [roomId]);

    return res.status(200).json({
      message: "XÃ³a phÃ²ng thÃ nh cÃ´ng.",
      room_id: roomId,
    });
  } catch (error) {
    console.error("Lá»—i xÃ³a phÃ²ng:", error);

    return res.status(500).json({
      message:
        "KhÃ´ng thá»ƒ xÃ³a phÃ²ng. CÃ³ thá»ƒ phÃ²ng Ä‘Ã£ phÃ¡t sinh dá»¯ liá»‡u liÃªn quan.",
    });
  }
});

module.exports = router;

