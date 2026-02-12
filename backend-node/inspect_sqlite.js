const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db.sqlite3');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    db.get("SELECT * FROM survey_responses LIMIT 1", (err, row) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Survey Row Keys:', row ? Object.keys(row) : 'No rows');
        console.log('Row:', row);
    });
});

db.close();
