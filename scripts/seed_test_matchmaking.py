import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/alumni.db')
db = sqlite3.connect(DB_PATH)
c = db.cursor()

# Valid bcrypt hash for '123456'
PASSWORD_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi592e.sMv3QZ1g/2.k0z5H.5Y8gR5q'

print('=== 使用 Python 初始化/生成喜结连理测试校友 ===')

# 1. 确保主校友 邹春朗
c.execute("SELECT id FROM alumni WHERE name = '邹春朗'")
row = c.fetchone()
if not row:
    c.execute("""
        INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
        VALUES ('邹春朗', '男', '经济管理学院', '1999', '18962116608', 'zoucl_wechat', 'APPROVED')
    """)
    alumni_id = c.lastrowid
else:
    alumni_id = row[0]
    c.execute("UPDATE alumni SET gender='男', phone='18962116608', status='APPROVED' WHERE id=?", (alumni_id,))

# 用户账号
c.execute("SELECT id FROM users WHERE username = '邹春朗' OR alumni_id = ?", (alumni_id,))
u_row = c.fetchone()
if u_row:
    c.execute("UPDATE users SET username='邹春朗', password_hash=?, status='APPROVED' WHERE id=?", (PASSWORD_HASH, u_row[0]))
else:
    c.execute("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES ('邹春朗', ?, 'USER', 'APPROVED', ?)", (PASSWORD_HASH, alumni_id))

# 申请
c.execute("""
    INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
    VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
    ON CONFLICT(alumni_id) DO UPDATE SET status='APPROVED', updated_at=CURRENT_TIMESTAMP
""", (alumni_id,))

# 自身条件
c.execute("""
    INSERT INTO matchmaking_profiles (
      alumni_id, gender, age, height, weight, hometown, marital_status, region,
      property_status, annual_income, job_type, degree, smoking, drinking,
      schedule, hobbies, personality, profile_completed, is_active, updated_at
    ) VALUES (
      ?, 'M', 32, 178, 72, '大连', '未婚', '杭州市',
      '有房有车', 45, '国企/互联网', '硕士', '不吸烟', '偶尔小酌',
      '规律（早睡早起）', ?, ?, 1, 1, CURRENT_TIMESTAMP
    )
    ON CONFLICT(alumni_id) DO UPDATE SET
      gender='M', age=32, height=178, weight=72, marital_status='未婚',
      annual_income=45, degree='硕士', smoking='不吸烟', drinking='偶尔小酌',
      schedule='规律（早睡早起）', hobbies=?, personality=?,
      profile_completed=1, is_active=1, updated_at=CURRENT_TIMESTAMP
""", (alumni_id, json.dumps(["旅游探索", "运动健身", "阅读思考"], ensure_ascii=False), json.dumps(["开朗自信", "沉稳踏实"], ensure_ascii=False),
      json.dumps(["旅游探索", "运动健身", "阅读思考"], ensure_ascii=False), json.dumps(["开朗自信", "沉稳踏实"], ensure_ascii=False)))

# 择偶标准
c.execute("""
    INSERT INTO matchmaking_criteria (
      alumni_id, age_min, age_max, height_min, height_max, weight_min, weight_max,
      income_min, income_max, marital_status, degree, smoking, drinking,
      schedule, hobbies, personality, criteria_completed, updated_at
    ) VALUES (
      ?, 24, 30, 160, 175, 45, 58,
      15, 50, ?, '本科', '不吸烟', '不限',
      '不限', ?, ?, 1, CURRENT_TIMESTAMP
    )
    ON CONFLICT(alumni_id) DO UPDATE SET
      age_min=24, age_max=30, height_min=160, height_max=175, weight_min=45, weight_max=58,
      income_min=15, income_max=50, marital_status=?, degree='本科', smoking='不吸烟',
      drinking='不限', schedule='不限', hobbies=?, personality=?,
      criteria_completed=1, updated_at=CURRENT_TIMESTAMP
""", (alumni_id, json.dumps(["未婚"], ensure_ascii=False), json.dumps(["旅游探索", "运动健身"], ensure_ascii=False), json.dumps(["温柔体贴", "开朗自信"], ensure_ascii=False),
      json.dumps(["未婚"], ensure_ascii=False), json.dumps(["旅游探索", "运动健身"], ensure_ascii=False), json.dumps(["温柔体贴", "开朗自信"], ensure_ascii=False)))

print(f"[基准校友] 邹春朗 (ID: {alumni_id}) 设置成功！账号: 邹春朗，密码: 123456")

# 2. 注入 3 位候选人
candidates = [
    {
        'name': '林互配',
        'gender': '女',
        'code': 'F',
        'college': '外国语学院',
        'year': '2016',
        'phone': '13800100001',
        'wechat': 'lin_hupei',
        'desc': '互相匹配（双方条件完全互符）',
        'profile': {
            'gender': 'F', 'age': 27, 'height': 166, 'weight': 50, 'hometown': '杭州',
            'marital_status': '未婚', 'region': '杭州市', 'property_status': '有房有车',
            'annual_income': 28, 'job_type': '高校/科研', 'degree': '硕士', 'smoking': '不吸烟',
            'drinking': '不喝酒', 'schedule': '规律（早睡早起）',
            'hobbies': json.dumps(['旅游探索', '艺术摄影', '阅读思考'], ensure_ascii=False),
            'personality': json.dumps(['温柔体贴', '善解人意'], ensure_ascii=False)
        },
        'criteria': {
            'age_min': 28, 'age_max': 36, 'height_min': 172, 'height_max': 185, 'weight_min': 65, 'weight_max': 85,
            'income_min': 30, 'marital_status': json.dumps(['未婚'], ensure_ascii=False), 'degree': '本科',
            'smoking': '不吸烟', 'drinking': '不限', 'schedule': '不限',
            'hobbies': json.dumps(['旅游探索', '运动健身'], ensure_ascii=False),
            'personality': json.dumps(['沉稳踏实'], ensure_ascii=False)
        }
    },
    {
        'name': '白与我',
        'gender': '女',
        'code': 'F',
        'college': '软件学院',
        'year': '2017',
        'phone': '13800100002',
        'wechat': 'bai_yuwo',
        'desc': '与我匹配（她符合我的标准，但要求极高男方未达到）',
        'profile': {
            'gender': 'F', 'age': 26, 'height': 168, 'weight': 51, 'hometown': '大连',
            'marital_status': '未婚', 'region': '杭州市', 'property_status': '有房无车',
            'annual_income': 36, 'job_type': '知名外企', 'degree': '硕士', 'smoking': '不吸烟',
            'drinking': '偶尔小酌', 'schedule': '规律（早睡早起）',
            'hobbies': json.dumps(['运动健身', '美食烹饪'], ensure_ascii=False),
            'personality': json.dumps(['开朗自信', '独立自主'], ensure_ascii=False)
        },
        'criteria': {
            'age_min': 28, 'age_max': 35, 'height_min': 185, 'height_max': 195, 'income_min': 100,
            'marital_status': json.dumps(['未婚'], ensure_ascii=False), 'degree': '博士', 'smoking': '不吸烟',
            'drinking': '不限', 'schedule': '不限', 'hobbies': json.dumps(['运动健身'], ensure_ascii=False),
            'personality': json.dumps(['开朗自信'], ensure_ascii=False)
        }
    },
    {
        'name': '赵我配',
        'gender': '女',
        'code': 'F',
        'college': '化工学院',
        'year': '2010',
        'phone': '13800100003',
        'wechat': 'zhao_wopei',
        'desc': '我匹配的（男方符合她的标准，但她自身不符合男方标准）',
        'profile': {
            'gender': 'F', 'age': 35, 'height': 156, 'weight': 48, 'hometown': '沈阳',
            'marital_status': '未婚', 'region': '杭州市', 'property_status': '暂无房车',
            'annual_income': 20, 'job_type': '民营企业', 'degree': '本科', 'smoking': '经常吸烟',
            'drinking': '偶尔小酌', 'schedule': '经常熬夜',
            'hobbies': json.dumps(['游戏电竞'], ensure_ascii=False),
            'personality': json.dumps(['随性豁达'], ensure_ascii=False)
        },
        'criteria': {
            'age_min': 28, 'age_max': 38, 'height_min': 170, 'height_max': 185, 'income_min': 20,
            'marital_status': json.dumps(['未婚'], ensure_ascii=False), 'degree': '大专', 'smoking': '不限',
            'drinking': '不限', 'schedule': '不限', 'hobbies': json.dumps([], ensure_ascii=False), 'personality': json.dumps([], ensure_ascii=False)
        }
    }
]

for c_info in candidates:
    c.execute("SELECT id FROM alumni WHERE name = ?", (c_info['name'],))
    c_row = c.fetchone()
    if not c_row:
        c.execute("""
            INSERT INTO alumni (name, gender, college, enrollment_year, phone, wechat_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
        """, (c_info['name'], c_info['gender'], c_info['college'], c_info['year'], c_info['phone'], c_info['wechat']))
        cand_id = c.lastrowid
    else:
        cand_id = c_row[0]
        c.execute("UPDATE alumni SET gender=?, college=?, enrollment_year=?, phone=?, wechat_id=?, status='APPROVED' WHERE id=?",
                  (c_info['gender'], c_info['college'], c_info['year'], c_info['phone'], c_info['wechat'], cand_id))

    # user
    c.execute("SELECT id FROM users WHERE username = ? OR alumni_id = ?", (c_info['name'], cand_id))
    cu_row = c.fetchone()
    if cu_row:
        c.execute("UPDATE users SET username=?, password_hash=?, role='USER', status='APPROVED' WHERE id=?",
                  (c_info['name'], PASSWORD_HASH, cu_row[0]))
    else:
        c.execute("INSERT INTO users (username, password_hash, role, status, alumni_id) VALUES (?, ?, 'USER', 'APPROVED', ?)",
                  (c_info['name'], PASSWORD_HASH, cand_id))

    # app
    c.execute("""
        INSERT INTO matchmaking_applications (alumni_id, status, updated_at)
        VALUES (?, 'APPROVED', CURRENT_TIMESTAMP)
        ON CONFLICT(alumni_id) DO UPDATE SET status='APPROVED', updated_at=CURRENT_TIMESTAMP
    """, (cand_id,))

    # profile
    p = c_info['profile']
    c.execute("""
        INSERT INTO matchmaking_profiles (
          alumni_id, gender, age, height, weight, hometown, marital_status, region,
          property_status, annual_income, job_type, degree, smoking, drinking,
          schedule, hobbies, personality, profile_completed, is_active, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 1, 1, CURRENT_TIMESTAMP
        )
        ON CONFLICT(alumni_id) DO UPDATE SET
          gender=?, age=?, height=?, weight=?, hometown=?, marital_status=?, region=?,
          property_status=?, annual_income=?, job_type=?, degree=?, smoking=?, drinking=?,
          schedule=?, hobbies=?, personality=?, profile_completed=1, is_active=1, updated_at=CURRENT_TIMESTAMP
    """, (
        cand_id, p['gender'], p['age'], p['height'], p['weight'], p['hometown'], p['marital_status'], p['region'],
        p['property_status'], p['annual_income'], p['job_type'], p['degree'], p['smoking'], p['drinking'],
        p['schedule'], p['hobbies'], p['personality'],
        p['gender'], p['age'], p['height'], p['weight'], p['hometown'], p['marital_status'], p['region'],
        p['property_status'], p['annual_income'], p['job_type'], p['degree'], p['smoking'], p['drinking'],
        p['schedule'], p['hobbies'], p['personality']
    ))

    # criteria
    cr = c_info['criteria']
    c.execute("""
        INSERT INTO matchmaking_criteria (
          alumni_id, age_min, age_max, height_min, height_max, weight_min, weight_max,
          income_min, marital_status, degree, smoking, drinking,
          schedule, hobbies, personality, criteria_completed, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, 1, CURRENT_TIMESTAMP
        )
        ON CONFLICT(alumni_id) DO UPDATE SET
          age_min=?, age_max=?, height_min=?, height_max=?, weight_min=?, weight_max=?,
          income_min=?, marital_status=?, degree=?, smoking=?, drinking=?,
          schedule=?, hobbies=?, personality=?, criteria_completed=1, updated_at=CURRENT_TIMESTAMP
    """, (
        cand_id, cr.get('age_min'), cr.get('age_max'), cr.get('height_min'), cr.get('height_max'), cr.get('weight_min'), cr.get('weight_max'),
        cr.get('income_min'), cr.get('marital_status'), cr.get('degree'), cr.get('smoking'), cr.get('drinking'),
        cr.get('schedule'), cr.get('hobbies'), cr.get('personality'),
        cr.get('age_min'), cr.get('age_max'), cr.get('height_min'), cr.get('height_max'), cr.get('weight_min'), cr.get('weight_max'),
        cr.get('income_min'), cr.get('marital_status'), cr.get('degree'), cr.get('smoking'), cr.get('drinking'),
        cr.get('schedule'), cr.get('hobbies'), cr.get('personality')
    ))

    print(f"[{c_info['desc']}] 姓名: {c_info['name']}, 账号: {c_info['name']}, 密码: 123456, 微信: {c_info['wechat']}")

db.commit()
db.close()
print('\n=== 测试数据写入本地数据库完成！===')
