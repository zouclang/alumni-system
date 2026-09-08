import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/alumni.db')
db = sqlite3.connect(DB_PATH)
c = db.cursor()

mock_names = ['林互配', '白与我', '赵我配']
count = 0

print('=== 开始清理测试校友数据 ===')
for name in mock_names:
    c.execute("SELECT id FROM alumni WHERE name = ?", (name,))
    row = c.fetchone()
    if row:
        al_id = row[0]
        c.execute("DELETE FROM matchmaking_connections WHERE applicant_alumni_id = ? OR target_alumni_id = ?", (al_id, al_id))
        c.execute("DELETE FROM matchmaking_criteria WHERE alumni_id = ?", (al_id,))
        c.execute("DELETE FROM matchmaking_profiles WHERE alumni_id = ?", (al_id,))
        c.execute("DELETE FROM matchmaking_applications WHERE alumni_id = ?", (al_id,))
        c.execute("DELETE FROM users WHERE alumni_id = ? OR username = ?", (al_id, name))
        c.execute("DELETE FROM alumni WHERE id = ?", (al_id,))
        print(f"- 已清理: {name} (ID: {al_id})")
        count += 1
    else:
        print(f"- 未找到: {name}")

db.commit()
db.close()
print(f'=== 清理完毕，共清理 {count} 位测试校友 ===')
