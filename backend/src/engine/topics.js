/**
 * 话题参考生成规则引擎（P1-2）
 *
 * 从步数+用药数据推导出「可以跟爸妈聊的话题」。
 * 3 类规则：事件类、趋势类、节气/节日类。
 *
 * @param {Object} analysis - 来自 report.js 的分析结果
 * @param {Object} parentData - { steps, medAdherence, parentName }
 * @returns {string[]} 话题列表
 */

// ── 中国节假日/节气库（2026 简版） ──
const HOLIDAYS = {
  '01-01': '元旦',
  '01-29': '春节',
  '02-14': '情人节',
  '03-08': '妇女节',
  '04-04': '清明节',
  '05-01': '劳动节',
  '05-11': '母亲节',
  '06-01': '儿童节',
  '06-15': '父亲节',
  '08-22': '七夕',
  '09-10': '教师节',
  '10-01': '国庆节',
  '10-25': '重阳节',
  '12-25': '圣诞节'
};

// ── 24 节气（2026 近似日期） ──
const SOLAR_TERMS = {
  '01-05': '小寒', '01-20': '大寒',
  '02-03': '立春', '02-18': '雨水',
  '03-05': '惊蛰', '03-20': '春分',
  '04-04': '清明', '04-20': '谷雨',
  '05-05': '立夏', '05-21': '小满',
  '06-05': '芒种', '06-21': '夏至',
  '07-07': '小暑', '07-22': '大暑',
  '08-07': '立秋', '08-23': '处暑',
  '09-07': '白露', '09-23': '秋分',
  '10-08': '寒露', '10-23': '霜降',
  '11-07': '立冬', '11-22': '小雪',
  '12-07': '大雪', '12-22': '冬至'
};

/**
 * 事件类：从步数数据找显著事件
 */
function generateEventTopics(stepsData, parentName) {
  const topics = [];

  if (!stepsData || !stepsData.length) return topics;

  const daily = stepsData.map(d => d.steps);

  // 某天步数突然下降（低于前3天均值的50%）
  if (daily.length >= 4) {
    for (let i = 3; i < daily.length; i++) {
      const prev3Avg = (daily[i-1] + daily[i-2] + daily[i-3]) / 3;
      if (daily[i] < prev3Avg * 0.5 && daily[i] < 500) {
        topics.push(`${parentName}某天突然几乎没走动，可以问问那天是不是身体不舒服`);
        break;
      }
    }
  }

  // 某天步数爆表（超过均值2倍）
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length;
  const maxDay = Math.max(...daily);
  if (maxDay > avg * 2 && maxDay > 5000) {
    topics.push(`${parentName}某天走了一大圈——是不是出门了？去哪里玩了？`);
  }

  // 连续 3 天以上零步数
  let consecutiveZero = 0;
  for (const d of daily) {
    if (d < 100) {
      consecutiveZero++;
      if (consecutiveZero >= 3) {
        topics.push(`${parentName}连续多天没怎么动——需要了解是不是在家闷着`);
        break;
      }
    } else {
      consecutiveZero = 0;
    }
  }

  return topics;
}

/**
 * 趋势类：从连续变化引出话题
 */
function generateTrendTopics(stepsData, medData, parentName) {
  const topics = [];

  if (stepsData && stepsData.length >= 5) {
    const daily = stepsData.map(d => d.steps);
    const first3 = daily.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const last3 = daily.slice(-3).reduce((a, b) => a + b, 0) / 3;

    // 步数持续下降
    if (last3 < first3 * 0.7 && last3 < 2000) {
      topics.push(`${parentName}这周越走越少——是天气原因还是身体原因？`);
    }

    // 步数持续上升（好的趋势）
    if (last3 > first3 * 1.5 && last3 > 3000) {
      topics.push(`${parentName}这周越走越多——最近是不是心情不错？`);
    }
  }

  // 用药趋势
  if (medData && medData.rate !== undefined) {
    if (medData.rate < 60) {
      topics.push(`${parentName}最近经常忘记吃药——是不是该换个提醒方式？`);
    } else if (medData.rate >= 95) {
      topics.push(`${parentName}用药很规律——可以夸夸他/她`);
    }
  }

  return topics;
}

/**
 * 节气/节日类：匹配当前日期的节日话题
 */
function generateHolidayTopics() {
  const topics = [];
  const now = new Date();
  const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  // 节日
  if (HOLIDAYS[mmdd]) {
    topics.push(`今天是${HOLIDAYS[mmdd]}——给${HOLIDAYS[mmdd] === '母亲节' || HOLIDAYS[mmdd] === '妇女节' ? '妈' : '爸妈'}打个电话`);
  }

  // 节气
  if (SOLAR_TERMS[mmdd]) {
    const term = SOLAR_TERMS[mmdd];
    const season = now.getMonth() >= 2 && now.getMonth() <= 4 ? '春' :
                   now.getMonth() >= 5 && now.getMonth() <= 7 ? '夏' :
                   now.getMonth() >= 8 && now.getMonth() <= 10 ? '秋' : '冬';
    topics.push(`今天${term}——提醒爸妈注意${season}季养生`);
  }

  // 节日前后 3 天
  for (const [date, name] of Object.entries(HOLIDAYS)) {
    const [m, d] = date.split('-').map(Number);
    const holiday = new Date(now.getFullYear(), m - 1, d);
    const diff = Math.abs(now - holiday) / 86400000;
    if (diff <= 3 && diff > 0) {
      topics.push(`${name}快到了——可以问问爸妈怎么过`);
      break;
    }
  }

  return topics;
}

/**
 * 主函数：生成话题列表
 * @param {Object} params
 * @param {Object} params.stepsData - [{ data_date, steps }]
 * @param {Object} params.medData - { rate, trend, note }
 * @param {string} params.parentName - 父/母称呼
 * @param {string} params.parentGender - 'father' | 'mother'
 * @returns {string[]} 最多返回 5 条话题
 */
function generateTopics({ stepsData, medData, parentName, parentGender }) {
  const name = parentName || (parentGender === 'mother' ? '妈' : '爸');

  const allTopics = [
    ...generateEventTopics(stepsData, name),
    ...generateTrendTopics(stepsData, medData, name),
    ...generateHolidayTopics()
  ];

  // 如果数据不足，给一个默认关心话题
  if (allTopics.length === 0) {
    allTopics.push(`问问${name}最近睡得好不好`);
    allTopics.push(`问问${name}有没有和老朋友出去散步`);
  }

  // 去重 + 最多5条
  return [...new Set(allTopics)].slice(0, 5);
}

module.exports = { generateTopics, HOLIDAYS, SOLAR_TERMS };
