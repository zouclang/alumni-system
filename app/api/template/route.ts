import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const headers = [
    '序号', '姓名', '家乡', '在校经历', '最高学历（包含外校）', 
    '联系电话', '兴趣爱好', '所在微信群', '大工人认证', 
    '生日月份', '性别', '所在区域', '事业类型', '工作单位', '职位', '所属行业', '社会职务'
  ];

  // 3 distinct examples
  const sampleData = [
    [
      '1', '张三', '辽宁省-大连市', '【本科:2010-2014】物理学院-应用物理', '本科', 
      '13800138001', '篮球、摄影', '苏州分会', '是', '5', '男', '工业园区', 
      '职业经理（含高管、职员等）', '大工科技有限公司', '经理', '信息技术', '苏州校友会理事'
    ],
    [
      '2', '李四', '江苏省-苏州市', '【本科:2005-2009】经管学院-工商管理|【硕士:2009-2012】管理学院-MBA', '硕士', 
      '13800138002', '羽毛球', '苏州分会,经管分会', '是', '8', '女', '高新区', 
      '自主创业（有公司）', '苏州创业园', '创始人', '互联网', '无'
    ],
    [
      '3', '王五', '山东省-青岛市', '【本科:2000-2004】机械学院-机械设计|【硕士:2004-2007】能动学院-热能工程|【博士:2007-2011】能动学院-内燃机', '博士', 
      '13800138003', '围棋', '苏州分会', '是', '12', '男', '姑苏区', 
      '其他（机关事业等）', '苏州市政府', '主任', '公共服务', '优秀校友'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '通讯录');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Disposition': 'attachment; filename="alumni_template.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
