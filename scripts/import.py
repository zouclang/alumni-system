#!/usr/bin/env python3
"""
Excel to SQLite Importer for DUT Suzhou Alumni Directory
Usage: python3 scripts/import.py
"""

import openpyxl
import sqlite3
import os
import datetime
import re

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', '大连理工大学苏州校友通讯录.xlsx')
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'alumni.db')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def clean_value(val):
    """Clean a cell value: strip strings, convert None to None, skip formulas."""
    if val is None:
        return None
    if isinstance(val, str):
        val = val.strip()
        # Skip Excel formula results stored as strings
        if val.startswith('='):
            return None
        if val == '' or val == 'None':
            return None
        return val
    if isinstance(val, datetime.datetime):
        return val.strftime('%Y-%m-%d')
    return val

def clean_year(val):
    """Extract 4-digit year from enrollment/graduation year fields."""
    if val is None:
        return None
    s = str(val).strip()
    # Match leading 4-digit year
    m = re.match(r'(\d{4})', s)
    if m:
        return m.group(1)
    return None

def clean_phone(val):
    """Clean phone number to string."""
    if val is None:
        return None
    s = str(val).strip()
    if s.startswith('=') or s == '':
        return None
    # Remove .0 suffix from numeric conversion
    s = re.sub(r'\.0$', '', s)
    return s

def parse_school_experiences(exp_str, college_norm_str):
    """Parse multi-segment experiences like '【本科:13-17|硕士:17-20】物理|经管'"""
    if not exp_str or not isinstance(exp_str, str):
        return []

    # Extract the bracketed part: "【本科:2013-2017|硕士:2017-2020】" -> "本科:2013-2017|硕士:2017-2020"
    m = re.search(r'【(.*?)】', exp_str)
    if not m:
        # Fallback if no brackets, just treat as one segment
        return [{'stage': exp_str, 'start': None, 'end': None, 'college': college_norm_str, 'sort_order': 0}]

    inner = m.group(1)
    segments = inner.split('|')

    
    colleges = str(college_norm_str).split('|') if college_norm_str else []

    results = []
    for i, seg in enumerate(segments):
        parts = seg.split(':')
        stage = parts[0].strip() if len(parts) > 0 else ''
        years = parts[1].strip() if len(parts) > 1 else ''
        
        start = None
        end = None
        if '-' in years:
            y_parts = years.split('-')
            start = y_parts[0][:4] if y_parts[0] else None
            end = y_parts[1][:4] if y_parts[1] else None
        else:
            start = clean_year(years)
            
        col = colleges[i].strip() if i < len(colleges) else (colleges[-1].strip() if colleges else '')
        
        results.append({
            'stage': stage,
            'start': start,
            'end': end,
            'college': col,
            'sort_order': i
        })

    return results

def main():
    print(f"Loading Excel from: {os.path.abspath(EXCEL_PATH)}")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb['通讯录']

    print(f"Connecting to DB: {os.path.abspath(DB_PATH)}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # The schema is already created by Next.js app on startup (lib/db.ts)
    # But just in case, we don't recreate it here, we assume lib/db.ts is right.
    # Just clear data
    cur.execute("DELETE FROM school_experiences")
    cur.execute("DELETE FROM alumni")
    print("Cleared existing data.")

    inserted = 0
    skipped = 0
    experiences_inserted = 0

    for row in ws.iter_rows(min_row=2, values_only=True):
        seq_no = row[0]
        name = clean_value(row[1])

        if not name:
            skipped += 1
            continue
            
        import re
        name = re.sub(r'\d+$', '', name)

        # Column mapping (0-indexed):
        # 0:序号 1:姓名 2:家乡 3:在校经历 4:入学时间 5:毕业年份 6:学院 7:整理后学院
        # 8:专业 9:学历 10:联系电话 11:兴趣爱好 12:QQ号 13:所在微信群 14:大工人认证 
        # 15:生日月份 16:性别 17:所在区域 18:事业类型 19:工作单位 20:职位 21:所属行业 22:社会职务

        record = (
            seq_no,
            name,
            standardize_hometown(clean_value(row[2])),   # hometown (was row[3])
            clean_value(row[3]),   # school_experience (was row[4])
            clean_year(row[4]),    # enrollment_year (was row[5])
            clean_year(row[5]),    # graduation_year (was row[6])
            clean_value(row[6]),   # college (was row[7])
            clean_value(row[7]),   # college_normalized (was row[8])
            clean_value(row[8]),   # major (was row[9])
            clean_value(row[9]),  # degree (was row[10])
            clean_phone(row[10]),  # phone (was row[11])
            clean_value(row[11]),  # interests (was row[12])
            clean_phone(row[12]),  # qq (was row[13])
            str(clean_value(row[13])).replace('、', ',') if clean_value(row[13]) else None,  # wechat_groups (was row[14])
            clean_value(row[14]),  # dut_verified (was row[15])
            int(row[15]) if isinstance(row[15], (int, float)) else None,  # birth_month (was row[16])
            clean_value(row[16]),  # gender (was row[17])
            clean_value(row[17]),  # region (was row[18])
            clean_value(row[18]),  # career_type (was row[19])
            clean_value(row[19]),  # company (was row[20])
            clean_value(row[20]),  # position (was row[21])
            clean_value(row[21]),  # industry (was row[22])
            clean_value(row[22]),  # social_roles (was row[23])
            pinyin_name,           # pinyin_name
        )

        cur.execute("""
            INSERT INTO alumni (
                seq_no, name, hometown, school_experience,
                enrollment_year, graduation_year, college, college_normalized, major,
                degree, phone, interests, qq, wechat_groups, dut_verified,
                birth_month, gender, region, career_type, company, position,
                industry, social_roles, pinyin_name
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, record)
        alumni_id = cur.lastrowid
        inserted += 1

        # Process school experiences
        exp_str = clean_value(row[4])
        college_norm_str = clean_value(row[8])
        experiences = parse_school_experiences(exp_str, college_norm_str)
        
        for exp in experiences:
            cur.execute("""
                INSERT INTO school_experiences (
                    alumni_id, stage, start_year, end_year, college, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (alumni_id, exp['stage'], exp['start'], exp['end'], exp['college'], exp['sort_order']))
            experiences_inserted += 1

    conn.commit()
    conn.close()

    print(f"\n✅ Import complete!")
    print(f"   Alumni Inserted: {inserted} records")
    print(f"   Experiences Inserted: {experiences_inserted} records")
    print(f"   Skipped:  {skipped} empty rows")

if __name__ == '__main__':
    main()
