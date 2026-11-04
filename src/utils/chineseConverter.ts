// 常用簡體中文到繁體中文的配對陣列，主要針對《血染鐘樓》角色與劇本中的文字
const rawPairs: [string, string][] = [
  ['厂', '廠'], ['广', '廣'], ['飞', '飛'], ['乡', '鄉'], ['无', '無'], ['专', '專'], ['云', '雲'], ['艺', '藝'], ['丑', '醜'], ['后', '後'],
  ['叶', '葉'], ['帮', '幫'], ['战', '戰'], ['柜', '櫃'], ['杰', '傑'], ['橘', '橘'], ['湿', '濕'], ['筑', '築'], ['胁', '脅'], ['蚕', '蠶'],
  ['厨', '廚'], ['师', '師'], ['灵', '靈'], ['疯', '瘋'], ['谜', '謎'], ['乱', '亂'], ['灯', '燈'],
  ['为', '為'], ['拥', '擁'], ['选', '選'], ['择', '擇'], ['这', '這'], ['测', '測'], ['试', '試'], ['与', '與'],
  ['谁', '誰'], ['贴', '貼'], ['轮', '輪'], ['迈', '邁'], ['运', '運'], ['违', '違'], ['递', '遞'], ['酱', '醬'], ['钟', '鐘'], ['钱', '錢'],
  ['雾', '霧'], ['点', '點'], ['赏', '賞'], ['金', '金'], ['猎', '獵'], ['人', '人'], ['务', '務'], ['员', '員'], ['师', '師'], ['调', '調'],
  ['查', '查'], ['共', '共'], ['情', '情'], ['僧', '僧'], ['侣', '侶'], ['鸦', '鴉'], ['送', '送'], ['葬', '葬'], ['图', '圖'], ['书', '書'],
  ['妇', '婦'], ['贞', '貞'], ['洁', '潔'], ['长', '長'], ['赌', '賭'], ['义', '義'], ['老', '老'], ['板', '闆'], ['驱', '驅'], ['游', '遊'],
  ['诗', '詩'], ['谣', '謠'], ['学', '學'], ['城', '城'], ['卖', '賣'], ['缝', '縫'], ['谕', '諭'], ['数', '數'], ['贤', '賢'], ['术', '術'],
  ['杂', '雜'], ['表', '錶'], ['梦', '夢'], ['兽', '獸'], ['报', '報'], ['丧', '喪'], ['传', '傳'], ['国', '國'], ['贵', '貴'], ['将', '將'],
  ['军', '軍'], ['炼', '煉'], ['农', '農'], ['骑', '騎'], ['气', '氣'], ['驾', '駕'], ['驶', '駛'], ['忆', '憶'], ['恶', '惡'], ['丰', '豐'],
  ['风', '風'], ['冈', '岡'], ['兰', '蘭'], ['划', '劃'], ['刘', '劉'], ['办', '辦'], ['双', '雙'], ['卢', '盧'], ['压', '壓'], ['厌', '厭'],
  ['县', '縣'], ['发', '髮'], ['發', '髮'], ['叹', '嘆'], ['只', '隻'], ['叽', '嘰'], ['吓', '嚇'], ['启', '啟'], ['呗', '唄'], ['咙', '嚨'], ['响', '響'],
  ['哑', '啞'], ['哗', '嘩'], ['哟', '喲'], ['唤', '喚'], ['乔', '喬'], ['单', '單'], ['吨', '噸'], ['听', '聽'], ['吴', '吳'], ['呐', '吶'],
  ['呓', '囈'], ['呕', '嘔'], ['东', '東'], ['买', '買'], ['冯', '馮'], ['凤', '鳳'], ['么', '麼'], ['门', '門'], ['们', '們'], ['闪', '閃'],
  ['闭', '閉'], ['问', '問'], ['闯', '闖'], ['闺', '閨'], ['闽', '閩'], ['阅', '閱'], ['阐', '闡'], ['辟', '辟'], ['阉', '閹'], ['阎', '閻'],
  ['阔', '闊'], ['阗', '闐'], ['阙', '闕'], ['阖', '闔'], ['关', '關'], ['陇', '隴'], ['陈', '陳'], ['陆', '陸'], ['阳', '陽'], ['阴', '陰'],
  ['阵', '陣'], ['阶', '階'], ['际', '際'], ['隐', '隱'], ['难', '難'], ['雏', '雛'], ['鸡', '雞'], ['虽', '雖'], ['欢', '歡'], ['戏', '戲'],
  ['邻', '鄰'], ['邮', '郵'], ['伟', '偉'], ['仅', '僅'], ['佣', '傭'], ['债', '債'], ['伤', '傷'], ['倾', '傾'], ['侧', '側'], ['侨', '僑'],
  ['侦', '偵'], ['仪', '儀'], ['侠', '俠'], ['侣', '侶'], ['侥', '僥'], ['伪', '偽'], ['俭', '儉'], ['储', '儲'], ['敛', '斂'], ['敕', '敕'],
  ['叙', '敘'], ['敌', '敵'], ['毙', '斃'], ['斩', '斬'], ['断', '斷'], ['旧', '舊'], ['时', '時'], ['旷', '曠'], ['旸', '暘'], ['昙', '曇'],
  ['昼', '晝'], ['显', '顯'], ['晋', '晉'], ['晒', '曬'], ['晓', '曉'], ['晔', '曄'], ['晕', '暈'], ['慢', '慢'], ['暂', '暫'], ['会', '會'],
  ['木', '木'], ['机', '機'], ['杀', '殺'], ['权', '權'], ['条', '條'], ['来', '來'], ['杨', '楊'], ['极', '極'], ['构', '構'], ['架', '架'],
  ['染', '染'], ['柠', '檸'], ['查', '查'], ['柬', '柬'], ['柯', '柯'], ['柳', '柳'], ['柴', '柴'], ['栅', '柵'], ['栈', '棧'], ['栖', '棲'],
  ['栗', '栗'], ['校', '校'], ['样', '樣'], ['根', '根'], ['格', '格'], ['栽', '栽'], ['栾', '欒'], ['桨', '槳'], ['桩', '樁'], ['乐', '樂'],
  ['楼', '樓'], ['标', '標'], ['终', '終'], ['织', '織'], ['绍', '紹'], ['绎', '繹'], ['经', '經'], ['结', '結'], ['绕', '繞'], ['绘', '繪'],
  ['给', '給'], ['绚', '絢'], ['绛', '絳'], ['络', '絡'], ['绝', '絕'], ['绞', '絞'], ['统', '統'], ['绩', '績'], ['绪', '緒'], ['续', '續'],
  ['绥', '綏'], ['绦', '絛'], ['继', '繼'], ['递', '遞'], ['缕', '縷'], ['编', '編'], ['缓', '緩'], ['缅', '緬'], ['纬', '緯'], ['练', '練'],
  ['萦', '縈'], ['缢', '縊'], ['缨', '纓'], ['缩', '縮'], ['缪', '繆'], ['缮', '繕'], ['缰', '繮'], ['缴', '繳'], ['辫', '辮'], ['总', '總'],
  ['绿', '綠'], ['线', '線'], ['缎', '緞'], ['缘', '緣'], ['绳', '繩'], ['缚', '縛'], ['缤', '繽'], ['网', '網'], ['纲', '綱'], ['绸', '綢'],
  ['绵', '綿'], ['沦', '淪'], ['沧', '滄'], ['飙', '飆'], ['飓', '颶'], ['飘', '飄'], ['馆', '館'], ['馈', '饋'], ['饯', '餞'], ['馅', '餡'],
  ['馋', '饞'], ['饵', '餌'], ['馒', '饅'], ['饕', '饕'], ['餮', '餮'], ['马', '馬'], ['驭', '馭'], ['驮', '馱'], ['驯', '馴'], ['驰', '馳'],
  ['驳', '駁'], ['驴', '驢'], ['驶', '駛'], ['驷', '駟'], ['驸', '駙'], ['驹', '駒'], ['驻', '駐'], ['驼', '駝'], ['驽', '駑'], ['驾', '駕'],
  ['驿', '驛'], ['骁', '驍'], ['骂', '罵'], ['骄', '驕'], ['抓', '抓'], ['骆', '駱'], ['骇', '駭'], ['骈', '駢'], ['骊', '驪'], ['骋', '騁'],
  ['验', '驗'], ['骏', '駿'], ['骐', '騏'], ['骒', '騍'], ['骓', '騅'], ['骗', '騙'], ['骚', '騷'], ['驾', '駕'], ['骜', '驁'], ['骠', '驃'],
  ['骡', '騾'], ['羁', '羈'], ['骤', '驟'], ['骥', '驥'], ['骨', '骨'], ['脏', '髒'], ['髓', '髓'], ['体', '體'], ['高', '高'], ['髻', '髻'],
  ['鬓', '鬢'], ['鬣', '鬣'], ['闹', '鬧'], ['阄', '鬮'], ['衅', '釁'], ['鬼', '鬼'], ['魁', '魁'], ['魂', '魂'], ['魄', '魄'], ['魅', '魅'],
  ['魇', '魘'], ['魈', '魈'], ['魉', '魎'], ['魏', '魏'], ['魔', '魔'], ['鱼', '魚'], ['鲁', '魯'], ['鲂', '魴'], ['鲅', '鮁'], ['鲆', '鮃'],
  ['鱼', '魚'], ['鲈', '鱸'], ['鲋', '鮒'], ['鲍', '鮑'], ['鲎', '鱟'], ['鲐', '駘'], ['鲑', '鮭'], ['鲔', '鮪'], ['鲜', '鮮'], ['鲞', '鯗'],
  ['寻', '尋'], ['鲤', '鯉'], ['鲥', '鰣'], ['tiao', '鰷'], ['sha', '鯊'], ['ji3', '鯽'], ['qing', '鯖'], ['ni', '鯢'], ['diao', '鯛'],
  ['鲸', '鯨'], ['鲺', '鯴'], ['鲽', '鰈'], ['鳃', '鰓'], ['鳄', '鱷'], ['鳅', '鰍'], ['鳍', '鰭'], ['鳎', '鰨'], ['鳏', '鰥'], ['鳐', '鰩'],
  ['鳔', '鰾'], ['鳕', '鱈'], ['鳖', '鱉'], ['鳗', '鰻'], ['鳞', '鱗'], ['鳟', '鱒'], ['鳝', '鱔'], ['鸟', '鳥'], ['鸡', '雞'], ['鸣', '鳴'],
  ['鸥', '鷗'], ['鸦', '鴉'], ['鸩', '鴆'], ['鸪', '鴣'], ['动', '動'], ['鸬', '鸕'], ['鸭', '鴨'], ['鸮', '鴞'], ['鸯', '鴦'], ['鸳', '鴛'],
  ['鸵', '鴕'], ['鸶', '鷥'], ['鸷', '鷙'], ['鸽', '鴿'], ['鸾', '鸞'], ['鸿', '鴻'], ['鹃', '鵑'], ['鹄', '鵠'], ['e2', '鵝'], ['que', '鵲'],
  ['鹌', '鵪'], ['鹏', '鵬'], ['ch', '鶉'], ['e3', '鶚'], ['gu3', '鶻'], ['yao2', '鷂'], ['he', '鶴'], ['ying', '鸚'], ['zhe', '鷓'],
  ['liao', '臨'], ['jiu2', '鷲'], ['yu2', '鷸'], ['lu4', '鷺'], ['ying2', '鷹'], ['mai', '麥'], ['fu2', '麩'], ['ma', '麻'], ['huang', '黃'],
  ['shu', '黍'], ['li2', '黎'], ['nian2', '黏'], ['hei', '黑'], ['mo2', '默'], ['dai', '黛'], ['xia', '黠'], ['an2', '黯'], ['ding', '鼎'],
  ['gu2', '鼓'], ['qi3', '齊'], ['ji4', '齏'], ['chi', '齒'], ['ling2', '齡'], ['yin2', '齦'], ['qu', '齲'], ['long', '龍'], ['gong', '龔'],
  ['kan', '龕'], ['gui2', '龜'],
  // 針對血染鐘樓特定角色/劇本關鍵字補強
  ['奥', '奧'], ['宠', '寵'], ['妃', '妃'], ['道', '道'], ['士', '士'], ['方', '方'], ['水', '水'], ['狸', '狸'], ['猫', '貓'], ['客', '客'], ['坊', '坊'],
  ['史', '史'], ['提', '提'], ['刑', '刑'], ['戏', '戲'], ['鸩', '鴆'], ['巡', '巡'], ['偃', '偃'], ['驿', '驛'], ['使', '使'], ['引', '引'],
  ['路', '路'], ['俑', '俑'], ['知', '知'], ['府', '府'], ['酒', '酒'], ['保', '保'], ['殓', '殮'], ['书', '書'], ['童', '童'], ['蛊', '蠱'],
  ['雕', '雕'], ['画', '畫'], ['皮', '皮'], ['禁', '禁'], ['卫', '衛'], ['军', '軍'], ['孟', '孟'], ['婆', '婆'], ['酿', '釀'], ['暴', '暴'],
  ['君', '君'], ['典', '典'], ['狱', '獄'], ['姑', '姑'], ['获', '獲'], ['鸟', '鳥'], ['奸', '奸'], ['佞', '佞'], ['阎', '閻'], ['罗', '羅'],
  ['险', '險'], ['象', '象'], ['环', '環'], ['生', '生'], ['罂', '罌'], ['种', '種'], ['诺', '諾'], ['达', '達'], ['蝨', '虱'], ['亚', '亞'],
  ['红', '紅'], ['妆', '妝'], ['钦', '欽'], ['监', '監'], ['摆', '擺'], ['渔', '漁'], ['镇', '鎮'], ['间', '間'], ['涡', '渦'], ['预', '預'],
  ['谍', '諜'], ['团', '團'], ['确', '確'], ['獭', '獺'], ['个', '個'], ['两', '兩'], ['场', '場'], ['圣', '聖'], ['鹰', '鷹'],
  ['洁', '潔'], ['魂', '魂'], ['传', '傳'], ['说', '說'], ['满', '滿']
]

// 擴充常用漢字簡繁對照背景字庫 (簡繁雙字交替：簡1繁1簡2繁2...)，用於在本地轉換時兜底覆蓋
const CHINESE_DICT = "证證纹紋闻聞语語贼賊医醫弃棄满滿禅禪洁潔萨薩婴嬰捞撈尸屍纸紙论論圣聖万萬与與专專业業丛叢东東丝絲丢丟两兩严嚴丧喪个個丰豐临臨为爲丽麗举舉么麼义義乌烏乐樂乔喬习習乡鄉书書买買乱亂争爭于於亏虧亚亞产產亩畝亲親亿億仅僅仆僕仑侖仓倉们們仪儀优優伤傷伫佇价價众衆会會伟偉传傳伥倀伪僞体體余餘佣傭佥僉侠俠侣侶侥僥侦偵侧側侨僑侩儈侪儕侬儂俦儔俨儼俩倆俪儷俭儉债債倾傾偬傯偻僂偿償傥儻傧儐储儲儿兒兑兌兖兗党黨兰蘭关關兴興兹茲养養兽獸冁囅内內冈岡册冊写寫军軍农農冯馮冲衝决決况況冻凍净淨凄悽准準凉涼减減凑湊凛凜几幾凤鳳凭憑凯凱击擊凿鑿划劃刘劉创創刚剛删刪刹剎则則剐剮剑劍剧劇办辦劝勸务務劢勱动動励勵劲勁劳勞势勢勋勳华華协協单單卖賣卢盧卤滷卧臥卫衛却卻厂廠厅廳历歷厉厲压壓厌厭厕廁厘釐厢廂厣厴厦廈厨廚厩廄厮廝县縣参參双雙发髮变變叙敘叠疊叶葉号號叹嘆叽嘰吁籲后後吓嚇吕呂吗嗎吨噸听聽启啓吴吳呒嘸呓囈员員呖嚦坝壩罢罷帮幫绑綁镑鎊谤謗剥剝饱飽宝寶报報鲍鮑辈輩贝貝钡鋇惫憊备備绷繃毕畢毙斃币幣闭閉辟闢边邊编編贬貶辩辯辫辮标標鳖鱉别別瘪癟濒瀕滨濱宾賓摈擯饼餅拨撥钵鉢铂鉑驳駁补補财財采採残殘惭慚惨慘灿燦苍蒼舱艙沧滄测測层層诧詫铲鏟阐闡颤顫场場尝嘗长長肠腸畅暢钞鈔车車尘塵陈陳衬襯撑撐称稱惩懲诚誠骋騁痴癡迟遲驰馳耻恥齿齒炽熾虫蟲宠寵踌躊筹籌绸綢丑醜锄鋤雏雛础礎触觸处處疮瘡闯闖锤錘辞辭赐賜聪聰囱囪蹿躥错錯达達哒噠贷貸带帶担擔郸鄲胆膽惮憚诞誕弹彈当當挡擋导導捣搗岛島祷禱盗盜灯燈邓鄧敌敵涤滌递遞缔締颠顛点點垫墊电電钓釣调調谍諜顶頂订訂栋棟斗鬥独獨读讀断斷锻鍛队隊对對顿頓钝鈍夺奪铎鐸堕墮讹訛恶惡饿餓额額罚罰阀閥珐琺烦煩饭飯范範贩販访訪纺紡飞飛废廢费費纷紛坟墳愤憤粪糞风風枫楓疯瘋缝縫讽諷辐輻抚撫辅輔妇婦负負复復赋賦盖蓋钙鈣杠槓搁擱鸽鴿阁閣给給贡貢沟溝钩鉤够夠构構购購顾顧雇僱挂掛观觀馆館贯貫惯慣广廣归歸规規闺閨轨軌诡詭贵貴刽劊柜櫃过過滤濾国國韩韓汉漢阂閡鹤鶴贺賀横橫轰轟红紅壶壺护護户戶哗譁画畫话話怀懷坏壞欢歡环環还還缓緩唤喚换換涣渙黄黃谎謊挥揮辉輝毁毀汇匯讳諱绘繪诲誨馈饋贿賄秽穢伙夥获獲货貨祸禍机機积積饥飢迹跡极極级級挤擠济濟记記纪紀际際继繼绩績辑輯夹夾颊頰贾賈钾鉀驾駕坚堅歼殲间間艰艱监監茧繭检檢碱鹼拣揀简簡荐薦槛檻鉴鑑践踐贱賤见見键鍵壳殼课課垦墾恳懇库庫裤褲夸誇宽寬旷曠矿礦溃潰扩擴阔闊蜡蠟来來莱萊赖賴蓝藍栏欄里裏态態卷捲轴軸输輸连連认認设設开開让讓误誤营營颜顏筛篩从從档檔录錄类類顺順资資没沒强強签籤该該张張议議执執败敗须須现現胜勝逻邏锁鎖踪蹤进進应應组組实實视視觉覺计計松鬆区區杆桿纯純转轉装裝详詳细細笔筆块塊据據页頁载載浏瀏览覽头頭钮鈕声聲盘盤纳納项項讯訊随隨懒懶萤螢软軟圆圓滚滾彻徹围圍较較轻輕离離阈閾椭橢属屬径徑腾騰质質雳靂紧緊渐漸扰擾衔銜拢攏稳穩适適频頻抢搶帧幀抛拋释釋题題异異约約针針润潤镜鏡远遠齐齊码碼奖獎静靜烁爍钥鑰识識拟擬啰囉词詞泪淚缀綴拦攔殒殞许許胶膠钉釘悬懸销銷赞贊维維烫燙尔爾脚腳虚虛热熱摇搖孙孫询詢诉訴领領脸臉锦錦遗遺挚摯责責诅詛脑腦惧懼睁睜愿願赶趕谋謀梼檮刍芻穷窮链鏈窃竊铃鈴莺鶯瘾癮讨討枪槍龙龍纠糾诈詐竖豎讷訥园園狮獅请請谢謝坠墜跄蹌银銀审審诃訶恋戀诵誦尽盡髅髏掷擲麦麥麸麩粘黏齑齏龄齡龈齦龋齲龚龔龛龕龟龜鲦鰷鲨鯊鲫鯽鲭鯖鲵鯢鲷鯛鹅鵝鹊鵲鹑鶉鹗鶚鹘鶻鹞鷂鹦鸚鹧鷓鹫鷲鹬鷸鹭鷺鹰鷹"

const s2tTable: Record<string, string> = {}
const t2sTable: Record<string, string> = {}

// 1. 先用交替字串初始化背景字庫
for (let i = 0; i < CHINESE_DICT.length; i += 2) {
  const sChar = CHINESE_DICT.charAt(i)
  const tChar = CHINESE_DICT.charAt(i + 1)
  s2tTable[sChar] = tChar
  t2sTable[tChar] = sChar
}

// 2. 再用血染鐘樓專用配對進行覆蓋，確保特有翻譯最優先
rawPairs.forEach(([s, t]) => {
  s2tTable[s] = t
  if ([...s].length === 1 && [...t].length === 1 && s !== '發') {
    t2sTable[t] = s
  }
})

// 3. 補充一簡對多繁的繁轉簡異體字映射，確保所有繁體字皆能準確轉為簡體
const t2sVariants: [string, string][] = [
  ['發', '发'], ['髮', '发'], ['為', '为'], ['爲', '为'], ['偽', '伪'], ['僞', '伪'],
  ['眾', '众'], ['衆', '众'], ['啟', '启'], ['啓', '启'], ['嘩', '哗'], ['譁', '哗'],
  ['裡', '里'], ['裏', '里'], ['製', '制'], ['複', '复'], ['復', '复'], ['並', '并'],
  ['併', '并'], ['摺', '折'], ['簽', '签'], ['籤', '签'], ['誌', '志'], ['註', '注'],
  ['佈', '布'], ['佔', '占'], ['緻', '致'], ['迴', '回'], ['嚮', '向'], ['祕', '秘'],
  ['瞭', '了'], ['剋', '克'], ['脣', '唇'], ['撃', '击'], ['擊', '击'], ['鬆', '松'],
  ['乾', '干'], ['幹', '干'], ['係', '系'], ['繫', '系'], ['檯', '台'], ['臺', '台'],
  ['餘', '余'], ['曆', '历'], ['歷', '历'], ['鍾', '钟'], ['鐘', '钟'], ['麵', '面'],
  ['徵', '征'], ['彙', '汇'], ['匯', '汇'], ['穫', '获'], ['獲', '获'], ['藉', '借'],
  ['昇', '升'], ['鬱', '郁'], ['禦', '御'], ['齣', '出'], ['髒', '脏'], ['臟', '脏']
]
t2sVariants.forEach(([t, s]) => {
  t2sTable[t] = s
})

/**
 * 將簡體中文字元轉換為繁體中文
 * @param str 輸入字串
 * @returns 轉換後的繁體中文串
 */
export function simplifyToTraditional(str: string): string {
  if (!str) return ''
  return str.split('').map(char => s2tTable[char] || char).join('')
}

/**
 * 將繁體中文字元轉換為簡體中文
 * @param str 輸入字串
 * @returns 轉換後的簡體中文串
 */
export function traditionalToSimplified(str: string): string {
  if (!str) return ''
  return str.split('').map(char => t2sTable[char] || char).join('')
}


// --- 核心 UI 中英對照翻譯字典 (繁體中文 -> 英文) ---
export const UI_EN_PAIRS: [string, string][] = [
  // 設置面板與次要區塊
  ['提示標記佈局 (Reminder Layout)', 'Reminder Layout'],
  ['提示標記佈局', 'Reminder Layout'],
  ['提示標記收納上限', 'Reminder Limit'],
  ['當玩家提示標記多於此數量時，自動摺疊為鎖頭', 'Auto-collapse reminders exceeding limit'],
  ['自訂角色技能音效', 'Custom Skill Sounds'],
  ['隱藏主畫面技能音效按鈕', 'Hide Skill Sound Button'],
  ['匯入角色技能音效', 'Import Skill Sound'],
  ['主要播放音效', 'Pinned Sound'],
  ['主要播放', 'Pinned'],
  ['暫無自訂技能音效，請點擊上方按鈕匯入', 'No custom sounds yet, click above to import'],
  ['自定義背景', 'Custom Background'],
  ['自訂背景', 'Custom Background'],
  ['白天背景', 'Day Background'],
  ['夜晚背景', 'Night Background'],
  ['預設白天', 'Default Day'],
  ['預設夜晚', 'Default Night'],
  ['匯入圖檔', 'Import Image'],
  ['計時器設置', 'Timer Settings'],
  ['到點鐘聲', 'Bell Sound'],
  ['桌面通知', 'Desktop Notification'],
  ['語言設置 (Language)', 'Language'],
  ['語言設置', 'Language'],
  ['軟體使用授權', 'Software License'],
  ['裝置識別碼：', 'Device ID: '],
  ['裝置識別碼', 'Device ID'],
  ['授權截止：', 'Expiration: '],
  ['授權截止', 'Expiration'],
  ['請貼上 24 位授權金鑰', 'Paste 24-digit License Key'],
  ['啟用中', 'Activating...'],
  ['啟用', 'Activate'],
  ['危險區域', 'Danger Zone'],
  ['重置狀態', 'Reset States'],
  ['重置遊戲', 'Reset Game'],
  ['資料管理', 'Data Management'],
  ['匯入遊戲', 'Import Game'],
  ['匯出遊戲', 'Export Game'],
  ['匯入劇本', 'Import Script'],
  ['匯出劇本', 'Export Script'],
  ['還原預設劇本', 'Restore Default Scripts'],
  ['重置預設角色', 'Reset Default Characters'],
  ['遊戲控制', 'Game Control'],
  ['設置選項', 'Settings'],
  ['投票面板', 'Voting Panel'],
  ['歷史日誌', 'Game Log'],
  ['夜晚行動順序', 'Night Order'],
  ['夜晚順序', 'Night Order'],
  ['說書人白板', 'Whiteboard'],
  ['白板', 'Whiteboard'],
  ['劇本管理系統', 'Script Manager'],
  ['劇本管理', 'Script Manager'],
  ['選取劇本', 'Select Script'],
  ['建立劇本', 'Create Script'],
  ['劇本清單', 'Script List'],
  ['劇本分類', 'Script Categories'],
  ['角色清單', 'Character List'],
  ['座位編排', 'Seat Arrangement'],
  ['開局', 'Setup'],
  ['向心排列', 'Inward'],
  ['環繞排列', 'Around'],

  // 魔典頂部狀態列與數據看板
  ['剩餘提名權', 'Nominations'],
  ['剩餘提名', 'Nominations'],
  ['處決門檻', 'Threshold'],
  ['有效票數', 'Votes'],
  ['有效票', 'Vote'],
  ['存活人數', 'Alive'],
  ['存活', 'Alive'],
  ['已死亡', 'Dead'],
  ['死亡', 'Dead'],
  ['幽靈票', 'Ghost Vote'],
  ['死亡票', 'Ghost Vote'],

  // 投票面板與階段控制
  ['首個夜晚', 'First Night'],
  ['其他夜晚', 'Other Night'],
  ['白天階段', 'Day Phase'],
  ['夜晚階段', 'Night Phase'],
  ['白天', 'Day'],
  ['夜晚', 'Night'],
  ['首夜', 'First Night'],
  ['今日可提名', 'Can Nominate'],
  ['今日已被提名', 'Nominated'],
  ['發起提名', 'Nominate'],
  ['進行投票', 'Vote'],
  ['直接投票', 'Direct Vote'],
  ['處決死', 'Executed'],
  ['處決', 'Execute'],
  ['復活', 'Revive'],
  ['變更角色', 'Change Role'],
  ['贊成票', 'Yes'],
  ['贊成', 'Yes'],
  ['反對', 'No'],
  ['棄權', 'Abstain'],
  ['投票結果', 'Vote Result'],
  ['通過處決', 'Executed'],
  ['未達門檻', 'Below Threshold'],
  ['平票', 'Tied'],

  // 陣營與類別
  ['鎮民', 'Townsfolk'],
  ['外來者', 'Outsider'],
  ['爪牙', 'Minion'],
  ['惡魔', 'Demon'],
  ['旅行者', 'Traveler'],
  ['傳說角色', 'Fabled'],
  ['傳奇角色', 'Fabled'],
  ['傳說', 'Fabled'],
  ['奇遇', 'Jinx'],
  ['善良陣營', 'Good'],
  ['邪惡陣營', 'Evil'],
  ['善良', 'Good'],
  ['邪惡', 'Evil'],

  // 通用控制按鈕
  ['確認新增', 'Confirm Add'],
  ['新增玩家', 'Add Player'],
  ['補足名額', 'Fill Seats'],
  ['輸入玩家姓名...', 'Enter player name...'],
  ['確認', 'Confirm'],
  ['取消', 'Cancel'],
  ['關閉', 'Close'],
  ['儲存', 'Save'],
  ['保存', 'Save'],
  ['編輯', 'Edit'],
  ['刪除', 'Delete'],
  ['重置', 'Reset'],
  ['搜尋', 'Search'],
  ['複製', 'Copy'],
  ['開始計時', 'Start'],
  ['結束計時', 'End'],
  ['暫停計時', 'Pause'],
  ['開始', 'Start'],
  ['暫停', 'Pause'],
  ['結束', 'End'],
  ['全選', 'Select All'],
  ['清空', 'Clear'],
  ['展開', 'Expand'],
  ['收起', 'Collapse'],
  ['全部角色', 'All Roles'],
  ['僅已派發', 'Assigned Only'],
  ['隱私模式', 'Privacy Mode'],
  ['隱私', 'Privacy'],
  // 設置選項與更多選單補充
  ['劇本管理系統', 'Script Manager'],
  ['劇本管理', 'Script Manager'],
  ['投票面板', 'Voting'],
  ['投票面闆', 'Voting'],
  ['對局記錄回顧', 'Game Log'],
  ['對局記錄', 'Game Log'],
  ['對局紀錄', 'Game Log'],
  ['自訂庫', 'Custom Library'],
  ['傳說奇遇', 'Fabled & Jinx'],
  ['夜晚順序', 'Night Order'],
  ['開局', 'Setup'],

  // 令片與盤面
  ['空座位', 'Empty'],
  ['空座', 'Empty'],

  // 偽裝抽屜
  ['DEMON的偽裝', 'Demon Bluffs'],
  ['Demon的偽裝', 'Demon Bluffs'],
  ['惡魔的偽裝', 'Demon Bluffs'],
  ['狂人的偽裝', 'Lunatic Bluffs'],
  ['瘋子的偽裝', 'Lunatic Bluffs'],
  ['的偽裝', ' Bluffs'],
  ['偽裝', 'Bluffs'],

  // 投票 HUD 與投票面板
  ['待處決: 無人達處決門檻', 'Pending: None reached threshold'],
  ['待處決：無人達到處決門檻', 'Pending: None reached threshold'],
  ['待處決: 無人達門檻', 'Pending: None reached threshold'],
  ['待處決: 無人達Threshold', 'Pending: None reached threshold'],
  ['待Execute: 無人達Threshold', 'Pending: None reached threshold'],
  ['待處決:', 'Pending: '],
  ['待處決：', 'Pending: '],
  ['待處決', 'Pending'],
  ['待Execute:', 'Pending: '],
  ['無人達處決門檻', 'None reached threshold'],
  ['無人達門檻', 'None reached threshold'],
  ['無人達到處決門檻', 'None reached threshold'],
  ['無人達Threshold', 'None reached threshold'],
  ['平票 (暫不處決)', 'Tied (No execution)'],
  ['今日尚無提名記錄', 'No nominations today'],
  ['今日尚未有任何提名', 'No nominations today'],
  ['今日尚無提名', 'No nominations today'],
  ['確認提名', 'Confirm Nomination'],
  ['Confirm提名', 'Confirm Nomination'],
  ['發起提名', 'Nominate'],
  ['提名者', 'Nominator'],
  ['被提名者', 'Nominee'],
  ['選擇玩家...', 'Select player...'],
  ['選擇玩家', 'Select player'],
  ['提名記錄', 'Nomination Records'],
  ['提名紀錄', 'Nomination Records'],
  ['提名了', 'nominated'],
  ['提名', 'Nominate'],
  ['記錄票數', 'Record Votes'],
  ['額外票數:', 'Extra votes:'],
  ['額外票數', 'Extra votes'],
  ['撤銷', 'Undo'],
  ['投票管理', 'Voting'],
  ['時間到！', "Time's up!"],
  ['時間到', "Time's up"],
  ['+1分', '+1m'],
  ['+30秒', '+30s'],

  // 計時器彈窗
  ['設定倒數時間', 'Set Timer'],
  ['設定倒數', 'Set Timer'],
  ['倒數計時', 'Countdown'],
  ['停止鐘聲', 'Stop Bell'],
  ['重設計時', 'Reset Timer'],

  // Game Log 對局記錄
  ['GAME LOG回顧', 'Game Log'],
  ['Game Log回顧', 'Game Log'],
  ['在此輸入手動筆記...', 'Enter manual note here...'],
  ['手動筆記', 'Manual Note'],
  ['新增筆記', 'Add Note'],
  ['目前尚無對局記錄', 'No game logs yet'],
  ['清除所有日誌', 'Clear All Logs'],
  ['清除日誌', 'Clear Logs'],
  ['匯出 JSON', 'Export JSON'],
  ['匯出JSON', 'Export JSON'],
  ['切換階段: ', 'Change phase: '],
  ['切換階段:', 'Change phase: '],
  ['切換階段', 'Change phase'],
  [' 上新增標記: ', ' added reminder: '],
  [' 上新增標記：', ' added reminder: '],
  [' 上移除標記: ', ' removed reminder: '],
  [' 上移除標記：', ' removed reminder: '],

  // 說書人白板 Whiteboard
  ['說書人資訊', 'Storyteller Whiteboard'],
  ['在下方輸入資訊後，可將手機展示給玩家查看。', 'Enter info below to showcase to players.'],
  ['在下方輸入資訊後，可將手機展示給玩家查看', 'Enter info below to showcase to players.'],
  ['Collapse設定', 'Collapse Settings'],
  ['Expand設定', 'Expand Settings'],
  ['收起設定', 'Collapse Settings'],
  ['展開設定', 'Expand Settings'],
  ['字體大小', 'Font Size'],
  ['文字顏色', 'Text Color'],
  ['字體與顏色設定', 'Font and Color Settings'],
  ['填入劇本角色', 'Insert Script Role'],
  ['提示卡', 'Hint Cards'],
  ['完成編輯', 'Done'],
  ['✎ 編輯', '✎ Edit'],
  ['✎ Edit', '✎ Edit'],
  ['該角色能力對你生效...', "This character's ability works on you..."],
  ['該角色能力對你生效', "This character's ability works on you"],
  ['這些角色不在場...', 'These characters are not in play...'],
  ['這些角色不在場', 'These characters are not in play'],
  ['你需要對這個角色瘋狂', 'You must be mad about this character'],
  ['你的陣營是', 'Your alignment is'],
  ['你的角色為', 'Your character is'],
  ['你是...', 'You are...'],
  ['你是', 'You are'],
  ['相同', 'Same'],
  ['不同', 'Different'],
  ['錯誤', 'False'],
  ['正確', 'True'],
  ['放大到全螢幕檢視', 'Full screen view'],
  ['已複製內容', 'Copied'],
  ['複製全部文字', 'Copy All Text'],
  ['Copy全部文字', 'Copy All Text'],
  ['清除全部內容', 'Clear Content'],
  ['清空全部內容', 'Clear Content'],
  ['檢視', 'View'],

  // 劇本名稱
  ['瓦釜雷鳴', 'Trouble Brewing'],
  ['暗流湧動', 'Trouble Brewing'],
  ['黯月初升', 'Bad Moon Rising'],
  ['教派與紫羅蘭', 'Sects & Violets'],
  ['無劇本', 'No Script'],

  // 夜晚行動順序 Night Order
  ['僅已派發', 'Assigned Only'],
  ['全部角色', 'All Roles'],
  ['恢復官方預設順序', 'Restore default order'],
  ['調整順序', 'Adjust Order'],
  ['此劇本無Night行動角色', 'No night action roles in this script'],
  ['此劇本無夜晚行動角色', 'No night action roles in this script'],
  ['此劇本無行動角色', 'No night action roles in this script'],
  ['按住拖拽排序', 'Drag to reorder'],
  ['白問', 'Whiteboard'],
  ['日間', 'Day'],

];

// 長詞優先排序，避免子詞提前替換
const sortedEnPairs = [...UI_EN_PAIRS].sort((a, b) => b[0].length - a[0].length);

/**
 * 將中文介面詞彙翻譯為英文
 * @param str 輸入繁體或簡體字串
 * @returns 轉換後的英文字串
 */
export function traditionalToEnglish(str: string): string {
  if (!str) return '';
  // 先統一轉為繁體再查字典
  let result = simplifyToTraditional(str);

  // 動態天數、夜數與輪數匹配
  result = result.replace(/第\s*(\d+)\s*天/g, 'Day $1');
  result = result.replace(/第\s*(\d+)\s*夜/g, 'Night $1');
  result = result.replace(/第\s*(\d+)\s*輪/g, 'Round $1');
  result = result.replace(/ROUND\s*(\d+)/gi, 'Round $1');

  // 陣營統計格式：鎮7 外2 爪2 惡1 -> T 7 O 2 M 2 D 1
  result = result.replace(/鎮\s*(\d+)\s*外\s*(\d+)\s*爪\s*(\d+)\s*惡\s*(\d+)/g, 'T $1 O $2 M $3 D $4');

  // 動態時間單位匹配：0 分 0 秒 -> 0m 0s
  result = result.replace(/(\d+)\s*分/g, '$1m');
  result = result.replace(/(\d+)\s*秒/g, '$1s');

  for (const [zh, en] of sortedEnPairs) {
    if (result.includes(zh)) {
      result = result.split(zh).join(en);
    }
  }
  return result;
}

// --- 全域 DOM 簡繁與語言自動轉換器 ---
export type AppLanguage = 'zh-TW' | 'zh-CN' | 'en'

interface CachedText {
  tw: string
  cn: string
  en: string
}
const origTextMap = new WeakMap<Text, CachedText>()
const origAttrMap = new WeakMap<Element, Record<string, CachedText>>()
const CONVERT_ATTRS = ['placeholder', 'title', 'aria-label']

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true
  const tag = el.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true
  if (el.closest && el.closest('[data-no-lang-convert]')) return true
  return false
}

function convertTextNode(node: Text, lang: AppLanguage) {
  if (shouldSkipElement(node.parentElement)) return
  const val = node.nodeValue
  if (!val || !val.trim()) return

  let cached = origTextMap.get(node)
  if (!cached || (val !== cached.tw && val !== cached.cn && val !== cached.en)) {
    const tw = simplifyToTraditional(val)
    const cn = traditionalToSimplified(tw)
    const en = traditionalToEnglish(tw)
    cached = { tw, cn, en }
    origTextMap.set(node, cached)
  }

  let targetVal = cached.tw
  if (lang === 'zh-CN') targetVal = cached.cn
  else if (lang === 'en') targetVal = cached.en

  if (node.nodeValue !== targetVal) {
    node.nodeValue = targetVal
  }
}

function convertElementAttrs(el: Element, lang: AppLanguage) {
  if (shouldSkipElement(el)) return
  for (const attr of CONVERT_ATTRS) {
    if (!el.hasAttribute(attr)) continue
    const val = el.getAttribute(attr)
    if (!val || !val.trim()) continue

    let attrRecord = origAttrMap.get(el)
    if (!attrRecord) {
      attrRecord = {}
      origAttrMap.set(el, attrRecord)
    }
    let cached = attrRecord[attr]
    if (!cached || (val !== cached.tw && val !== cached.cn && val !== cached.en)) {
      const tw = simplifyToTraditional(val)
      const cn = traditionalToSimplified(tw)
      const en = traditionalToEnglish(tw)
      cached = { tw, cn, en }
      attrRecord[attr] = cached
    }

    let targetVal = cached.tw
    if (lang === 'zh-CN') targetVal = cached.cn
    else if (lang === 'en') targetVal = cached.en

    if (el.getAttribute(attr) !== targetVal) {
      el.setAttribute(attr, targetVal)
    }
  }
}

export function applyLanguageToSubtree(root: Node, lang: AppLanguage) {
  if (typeof document === 'undefined') return
  if (root.nodeType === Node.TEXT_NODE) {
    convertTextNode(root as Text, lang)
    return
  }
  if (root.nodeType === Node.ELEMENT_NODE) {
    convertElementAttrs(root as Element, lang)
  }
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  )
  let current: Node | null = walker.nextNode()
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      convertTextNode(current as Text, lang)
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      convertElementAttrs(current as Element, lang)
    }
    current = walker.nextNode()
  }
}

let domObserver: MutationObserver | null = null

export function syncDocumentLanguage(lang: AppLanguage, getLang: () => AppLanguage) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.title = lang === 'zh-CN' 
    ? traditionalToSimplified('血染鐘樓謎團魔典') 
    : (lang === 'en' ? 'Blood on the Clocktower Grimoire' : '血染鐘樓謎團魔典')
  if (document.body) {
    applyLanguageToSubtree(document.body, lang)
  }

  if (!domObserver && typeof MutationObserver !== 'undefined' && document.body) {
    domObserver = new MutationObserver((mutations) => {
      const currentLang = getLang()
      if (currentLang === 'zh-TW') return
      for (const m of mutations) {
        if (m.type === 'characterData') {
          convertTextNode(m.target as Text, currentLang)
        } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
          convertElementAttrs(m.target as Element, currentLang)
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            applyLanguageToSubtree(node, currentLang)
          })
        }
      }
    })
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: CONVERT_ATTRS
    })
  }
}

/**
 * 規格化角色名稱，用於去重與自動 ID 映射
 * 轉為繁體、去除所有空白、括號
 */
export function normalizeName(name: string): string {
  if (!name) return ''
  const traditional = simplifyToTraditional(name)
  return traditional
    .trim()
    .toLowerCase()
    .replace(/[\s\u200b-\u200d\ufeff]+/g, '') // 移除包含零寬度空格的所有空格
    .replace(/[\(\)（）]/g, '')                // 移除中英文括號，避免如 "洗冤錄(Fabled)" 比對失敗
}

