const db = require("./config/db");

async function main() {
  try {
    const [result] = await db.query(
      "SELECT DATABASE() AS tenDatabase"
    );
    console.log("Database đang kết nối:");
    console.table(result);

    const [columns] = await db.query(
      "SHOW COLUMNS FROM tenants"
    );
    console.log("Các cột trong bảng tenants:");
    console.table(columns.map(c => c.Field));
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.end();
  }
}

main();
