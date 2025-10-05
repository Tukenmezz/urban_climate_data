async function initializeApp() {
    // --- 1. VERİ YÖNETİMİ ---
    const dataCache = {}; 
    let yearlyScores; 
    let geojson;
    let forecastData2027;

    try {
        [yearlyScores, geojson, forecastData2027] = await Promise.all([
            fetch('/api/scores/yearly').then(res => res.json()),
            fetch('/frontend/tr-cities.json').then(res => res.json()),
            fetch('/api/scores/2027').then(res => res.json())
        ]);
        dataCache['2027'] = forecastData2027;
    } catch (error) {
        console.error("Başlangıç verileri yüklenemedi:", error);
        alert("Uygulama başlatılamadı. Backend sunucusunun çalıştığından emin olun.");
        return;
    }

    async function fetchAndCacheYearData(year) {
        if (dataCache[year]) { return dataCache[year]; }
        console.log(`Sunucudan ${year} yılı için detaylı veriler çekiliyor...`);
        try {
            const data = await fetch(`/api/scores/${year}`).then(res => res.json());
            dataCache[year] = data;
            return data;
        } catch (error) {
            console.error(`${year} yılı verisi çekilemedi:`, error);
            return null;
        }
    }

    // --- 2. MERKEZİ DEĞİŞKENLER VE AYARLAR ---
    let currentYear = 2020;
    let currentMonth = 'all';
    let currentScores = yearlyScores[currentYear] || {};
    let selectedFeature = null;
    let currentLang = 'tr';
    
    const svg = d3.select('#map');
    const g = svg.append('g').attr('class', 'map-group');
    const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    const canvas = document.getElementById('starfield-canvas');
    const ctx = canvas.getContext('2d');
    let stars = [];

    // --- 3. RENK FONKSİYONU ---
    function getColorFromScore(score) {
        if (score === undefined || score === null) return "#6c757d";
        if (score <= 51) return "#e74c3c";
        if (score <= 55) return "#f1c40f";
        return "#2ecc71";
    }

    // --- 4. SİMÜLE EDİLMİŞ LLM CEVAPLARI ---
    const llmResponses = {
        tr: {
            poor: { ANALYSIS_HEADER: "Durum Analizi: Kritik Seviye", GENERAL_SITUATION: " şehrinin ekolojik sağlığı kritik bir seviyededir. Hava kalitesi, su kaynakları ve kentsel ısı adası gibi konularda acil iyileştirmeler gerekmektedir.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Yerel Yönetim İçin Stratejiler:", STRATEGIES: ["Kirlilik kaynaklarını tespit etmek için şehir genelinde sensör ağları kurun.", "Araç trafiğini azaltmak için toplu taşımayı teşvik edin ve yeşil koridorlar oluşturun.", "Su kayıp-kaçak oranlarını düşürmek için altyapı çalışmalarına öncelik verin."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Vatandaşlar İçin Öneriler:", CITIZEN_RECS: ["Mümkün olduğunca toplu taşıma, bisiklet veya yürümeyi tercih edin.", "Su tüketimini azaltmak için evde tasarruflu armatürler kullanın.", "Yerel çevre temizliği etkinliklerine katılarak farkındalık yaratın."] },
            average: { ANALYSIS_HEADER: "Durum Analizi: Denge Arayışı", GENERAL_SITUATION: " şehrinin ekolojik durumu orta seviyededir, ancak iyileştirme için önemli bir potansiyel barındırmaktadır.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Yerel Yönetim İçin Stratejiler:", STRATEGIES: ["Binalarda enerji verimliliğini artırmak için yalıtım ve yeşil çatı programları başlatın.", "Geri dönüşüm oranlarını artırmak için atık ayrıştırma tesislerine yatırım yapın.", "Park ve rekreasyon alanlarını genişleterek şehirdeki yeşil dokuyu güçlendirin."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Vatandaşlar İçin Öneriler:", CITIZEN_RECS: ["Atıklarınızı (cam, plastik, kağıt) ayrıştırarak geri dönüşüme kazandırın.", "Enerji tasarruflu ampuller ve ev aletleri kullanarak elektrik tüketimini azaltın.", "Balkonunuzda veya bahçenizde küçük ölçekli de olsa bitki yetiştirin."] },
            good: { ANALYSIS_HEADER: "Durum Analizi: Yeşil Başarı", GENERAL_SITUATION: " şehrinin ekolojik sağlığı iyi durumdadır. Bu başarının korunması için sürdürülebilirlik ve inovasyon odaklı politikalar izlenmelidir.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Yerel Yönetim İçin Stratejiler:", STRATEGIES: ["Kamu binaları ve sokak aydınlatmaları için yenilenebilir enerji kullanımını artırın.", "Döngüsel ekonomi modellerini destekleyerek atık üretimini en aza indirin.", "Yerel biyoçeşitliliği korumak için doğal yaşam alanları oluşturun."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Vatandaşlar İçin Öneriler:", CITIZEN_RECS: ["Yerel ve sürdürülebilir ürünler satan işletmeleri destekleyin.", "Yağmur suyu hasadı gibi yöntemlerle su kaynaklarını daha verimli kullanın.", "Çevresel konularda bilinçlenmek için yerel seminerlere katılın."] }
        },
        en: {
            poor: { ANALYSIS_HEADER: "Analysis: Critical Level", GENERAL_SITUATION: "'s ecological health is at a critical level. Urgent improvements are required in areas like air quality, water resources, and urban heat island effect.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Strategies for Local Government:", STRATEGIES: ["Establish city-wide sensor networks to identify pollution sources.", "Promote public transport to reduce traffic and create green corridors.", "Prioritize infrastructure works to reduce water loss rates."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Recommendations for Citizens:", CITIZEN_RECS: ["Prefer public transport, cycling, or walking.", "Use water-saving fixtures at home to reduce consumption.", "Participate in local cleanup events to raise awareness."] },
            average: { ANALYSIS_HEADER: "Analysis: Seeking Balance", GENERAL_SITUATION: "'s ecological condition is average, but holds significant potential for improvement.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Strategies for Local Government:", STRATEGIES: ["Launch green roof programs to increase energy efficiency in buildings.", "Invest in waste sorting facilities to increase recycling rates.", "Strengthen the city's green fabric by expanding parks."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Recommendations for Citizens:", CITIZEN_RECS: ["Sort your waste (glass, plastic, paper) for recycling.", "Reduce electricity consumption with energy-saving appliances.", "Grow plants on your balcony or in your garden."] },
            good: { ANALYSIS_HEADER: "Analysis: Green Achievement", GENERAL_SITUATION: "'s ecological health is in good condition. To maintain this success, sustainability and innovation-focused policies should be pursued.", STRATEGIES_FOR_LOCAL_GOV_HEADER: "Strategies for Local Government:", STRATEGIES: ["Increase the use of renewable energy for public buildings.", "Minimize waste generation by supporting circular economy models.", "Create natural habitats to protect local biodiversity."], RECOMMENDATIONS_FOR_CITIZENS_HEADER: "Recommendations for Citizens:", CITIZEN_RECS: ["Support local and sustainable businesses.", "Use water resources more efficiently with methods like rainwater harvesting.", "Participate in local seminars to become more environmentally conscious."] }
        }
    };
    
    // --- 5. DİL ÇEVİRİLERİ (i18n) ---
    const translations = {
        tr: {
            headerTitle: 'Türkiye Ekolojik Harita', headerDesc: 'Şehre tıklayınca sınırlar büyür, renkler yıl bazlı skor ile gösterilir.',
            infoHeader: 'EcoPulse', infoBody: 'Şehrin nabzı. EcoPulse, şehirlerin çevresel sağlığını ve sürdürülebilirliğini ölçen bir platformdur.',
            aiHeader: 'Genel Bilgi', forecastHeader: (season) => `2027 ${season} Tahmini`,
            forecastComparison: (diff, status) => `Bu, mevcut skordan ${diff} puan daha ${status}.`, statusBetter: 'iyi', statusWorse: 'kötü', statusSame: 'aynı',
            llmHeader: '🤖 AI Eko-Danışman Raporu',
            seasons: { q1: 'Kış', q2: 'İlkbahar', q3: 'Yaz', q4: 'Sonbahar' },
            rankingTitle: 'Sıralama Listesi', selectedCityLabel: 'Seçilen şehir:', selectedNone: 'Yok', heartbeatText: 'Nabız =', legendLow: '0 - 51 Ekolojik tehlike', legendMid: '51 - 55 Ekolojik stres', legendHigh: '55 - 100 Ekolojik denge',
            chatbotWelcome: 'Merhaba! Bir şehir seçin ve bilgi alın.', chatbotPlaceholder: 'Mesajınızı yazın...', chatbotSend: 'Gönder', chatbotNoCity: 'Önce bir şehir seçmelisiniz.', 
            chatbotProblem: ' için temel sorunlar: Hava kirliliği ve su stresi.', chatbotAdvice: ' için öneriler: Yeşil alanları artırmak ve temiz enerji kaynaklarına yönelmek.',
            chatbotScore: ' şehrinin skoru:', chatbotScoreRank: (p) => `Bu skor, o an görüntülenen diğer şehirlerin %${p}'sinden daha iyi.`,
            chatbotButtons: { problem:'Problem', advice:'Öneri', greenery:'Yeşillik', score:'Skor' },
            leftTabs: { info: "Bilgi", ranking: "🏅 Sıralama" }, rankingTable: { rank: "#", city: "Şehir", score: "Skor" },
            months: ["Tüm Yıl","Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
            controlsText: "Renkler yıl bazlı skor verisine göre otomatik atanır.", resetMap: "Tüm Haritaya Dön"
        },
        en: {
            headerTitle: 'Turkey Eco Map', headerDesc: 'Click a city to expand its borders; colors show year-based score.',
            infoHeader: 'EcoPulse', infoBody: 'City pulse. EcoPulse is a platform that measures the environmental health and sustainability of cities.',
            aiHeader: 'General Info', forecastHeader: (season) => `2027 ${season} Forecast`,
            forecastComparison: (diff, status) => `This is ${diff} points ${status} than the current score.`, statusBetter: 'better', statusWorse: 'worse', statusSame: 'the same',
            llmHeader: '🤖 AI Eco-Advisor Report',
            seasons: { q1: 'Winter', q2: 'Spring', q3: 'Summer', q4: 'Autumn' },
            rankingTitle: 'Ranking List', selectedCityLabel: 'Selected city:', selectedNone: 'None', heartbeatText: 'Pulse =', legendLow: '0 - 51 Ecological danger', legendMid: '51 - 55 Ecological stress', legendHigh: '55 - 100 Ecological balance',
            chatbotWelcome: 'Hello! Select a city and get information.', chatbotPlaceholder: 'Type your message...', chatbotSend: 'Send',
            chatbotNoCity: 'Please select a city first.', chatbotProblem: ' main problems: Air pollution and water stress.',
            chatbotAdvice: ' recommendations: Increase green areas and switch to clean energy sources.',
            chatbotScore: ' score is:', chatbotScoreRank: (p) => `This score is better than ${p}% of other cities currently displayed.`,
            chatbotButtons: { problem:'Problem', advice:'Advice', greenery:'Greenery', score:'Score' },
            leftTabs: { info: "Info", ranking: "🏅 Ranking" }, rankingTable: { rank: "#", city: "City", score: "Score" },
            months: ["All Year","January","February","March","April","May","June","July","August","September","October","November","December"],
            controlsText: "Colors are assigned automatically based on the year-based score.", resetMap: "Return to Full Map"
        }
    };

    // --- 6. ANA FONKSİYONLAR ---
    function updateLanguageUI() {
        const t = translations[currentLang];
        document.getElementById('header-title').textContent = t.headerTitle; document.getElementById('header-desc').textContent = t.headerDesc;
        document.querySelector('.left-tab[data-tab="info"]').textContent = t.leftTabs.info; document.querySelector('.left-tab[data-tab="ranking"]').textContent = t.leftTabs.ranking;
        document.getElementById('ranking-title').textContent = t.rankingTitle;
        const ths = document.querySelectorAll('#ranking-table thead th');
        ths[0].textContent = t.rankingTable.rank; ths[1].textContent = t.rankingTable.city; ths[2].textContent = t.rankingTable.score;
        document.getElementById('legend-low').textContent = t.legendLow; document.getElementById('legend-mid').textContent = t.legendMid; document.getElementById('legend-high').textContent = t.legendHigh;
        document.getElementById('selected-city-label').textContent = t.selectedCityLabel; document.getElementById('controls-text').textContent = t.controlsText;
        document.getElementById('reset-map').textContent = t.resetMap; document.getElementById('chatbot-welcome').textContent = t.chatbotWelcome;
        document.getElementById('chatbot-input').placeholder = t.chatbotPlaceholder; document.getElementById('chatbot-send').textContent = t.chatbotSend;
        const monthTabsContainer = document.querySelector('.month-tabs');
        if(monthTabsContainer) { monthTabsContainer.innerHTML = t.months.map((month, i) => { const monthValue = i === 0 ? 'all' : String(i).padStart(2, '0'); const isActive = monthValue === currentMonth ? 'active' : ''; return `<div class="month-tab ${isActive}" data-month="${monthValue}">${month}</div>`; }).join(''); }
        Object.keys(t.chatbotButtons).forEach(key => { const btn = document.querySelector(`.chatbot-btn[data-query="${key}"]`); if(btn) btn.textContent = t.chatbotButtons[key]; });
        
        let infoHeaderText = `<strong>${t.infoHeader}</strong>`;
        if (selectedFeature) {
            infoHeaderText = `<strong>${t.aiHeader}</strong>`;
            document.getElementById('info-header').innerHTML = infoHeaderText;
            document.getElementById('info-body').textContent = selectedFeature.properties.name;
            const scoreValue = currentScores[selectedFeature.properties.name];
            document.getElementById('selected').textContent = `${selectedFeature.properties.name} — Skor: ${typeof scoreValue === 'number' ? scoreValue.toFixed(2) : 'N/A'}`;
        } else {
            document.getElementById('info-header').innerHTML = infoHeaderText;
            document.getElementById('info-body').textContent = t.infoBody;
            document.getElementById('selected').textContent = t.selectedNone;
        }
        updateHeartbeat(selectedFeature ? currentScores[selectedFeature.properties.name] : 0);
        updateRankingTable(currentScores);
        updateAdvancedInfoPanel();
        updateForecastPanel();
    }
    
    function updateMap(scoresToDisplay) { currentScores = scoresToDisplay; g.selectAll('path').transition().duration(200).attr('fill', d => getColorFromScore(scoresToDisplay ? scoresToDisplay[d.properties.name] : undefined)); updateRankingTable(scoresToDisplay); }
    
    function onFeatureClick(feature, targetElement) {
        selectedFeature = feature;
        g.selectAll('path').classed('selected', false).style('opacity', 0.5);
        d3.select(targetElement).classed('selected', true).style('opacity', 1);
        const projection = d3.geoMercator().fitSize([800, 700], geojson);
        const pathGen = d3.geoPath().projection(projection);
        const [[x0, y0], [x1, y1]] = pathGen.bounds(feature);
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(800 / 2, 700 / 2).scale(Math.min(8, 0.9 / Math.max((x1 - x0) / 800, (y1 - y0) / 700))).translate(-(x0 + x1) / 2, -(y0 + y1) / 2) );
        updateLanguageUI();
    }

    function updateHeartbeat(score) {
        const heart = document.getElementById('heart'); if (!heart) return;
        const text = document.getElementById('heartbeat-text');
        text.textContent = `${translations[currentLang].heartbeatText} ${typeof score === 'number' ? score.toFixed(2) : 0}`;
        if (score > 0) { heart.style.animationName = 'heartbeat'; heart.style.animationIterationCount = 'infinite'; heart.style.animationDuration = `${2 - (score / 100) * 1.5}s`; }
        else { heart.style.animationName = 'none'; }
    }

    function updateRankingTable(scoresToDisplay) {
        const tbody = d3.select('#ranking-table tbody'); tbody.html('');
        if (!scoresToDisplay) return;
        const arr = Object.entries(scoresToDisplay).filter(d=>d[1]!==null && d[1]!==undefined).sort((a, b) => b[1] - a[1]);
        arr.forEach((d, i) => { let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''; const scoreText = typeof d[1] === 'number' ? d[1].toFixed(2) : 'N/A'; tbody.append('tr').html(`<td>${i + 1}</td><td>${medal} ${d[0]}</td><td>${scoreText}</td>`); });
    }

    async function sendMessage(query) {
        const input = document.getElementById('chatbot-input');
        const text = (typeof query === 'string') ? query : input.value.trim();
        if (!text) return;
        const content = document.getElementById('chatbot-content');
        if (typeof query !== 'string') { const userDiv = document.createElement('div'); userDiv.style.cssText = 'align-self:flex-end; background:#2a3b60; padding:4px 6px; border-radius:4px; font-size:12px;'; userDiv.textContent = text; content.appendChild(userDiv); }
        const botDiv = document.createElement('div');
        botDiv.style.cssText = 'align-self:flex-start; background:#334a7a; padding:4px 6px; border-radius:4px; font-size:12px; color:#fff;';
        const cityName = selectedFeature ? selectedFeature.properties.name : null;
        const t = translations[currentLang];
        if (!cityName) { botDiv.textContent = t.chatbotNoCity;
        } else if (text.toLowerCase().includes(t.chatbotButtons.score.toLowerCase())) {
            const cityScore = currentScores[cityName];
            if (cityScore === undefined || cityScore === null) { botDiv.textContent = `${cityName} için gösterilecek skor bulunmuyor.`; }
            else {
                const allScores = Object.values(currentScores).filter(s => s !== undefined && s !== null);
                const citiesBelow = allScores.filter(s => s < cityScore).length;
                const percentile = (citiesBelow / allScores.length) * 100;
                const scoreText = `${cityName}${t.chatbotScore} ${cityScore.toFixed(2)}.`;
                const rankText = t.chatbotScoreRank(percentile.toFixed(0));
                botDiv.textContent = `${scoreText} ${rankText}`;
            }
        } else if (text.toLowerCase().includes(t.chatbotButtons.problem.toLowerCase())) { botDiv.textContent = cityName + t.chatbotProblem; }
        else if (text.toLowerCase().includes(t.chatbotButtons.advice.toLowerCase())) { botDiv.textContent = cityName + t.chatbotAdvice; }
        else { botDiv.textContent = `${cityName} - Skor: ${currentScores[cityName] !== undefined ? currentScores[cityName].toFixed(2) : 'N/A'}`; }
        content.appendChild(botDiv); content.scrollTop = content.scrollHeight; input.value = '';
    }

    function updateForecastPanel() {
        const forecastPanel = document.getElementById('forecast-comparison');
        const llmPanel = document.getElementById('llm-recommendation');
        const t = translations[currentLang];
        if (!selectedFeature || currentMonth === 'all' || !forecastData2027) {
            forecastPanel.style.display = 'none'; llmPanel.style.display = 'none'; return;
        }
        const cityName = selectedFeature.properties.name;
        const cityForecasts = forecastData2027.scores[cityName];
        const currentScore = currentScores[cityName];
        if (!cityForecasts || currentScore === undefined) {
            forecastPanel.style.display = 'none'; llmPanel.style.display = 'none'; return;
        }
        const month = parseInt(currentMonth, 10);
        let quarter;
        if (month >= 1 && month <= 3) quarter = 'q1'; else if (month >= 4 && month <= 6) quarter = 'q2';
        else if (month >= 7 && month <= 9) quarter = 'q3'; else quarter = 'q4';
        const forecastScore = cityForecasts[quarter];
        if (forecastScore === undefined) {
            forecastPanel.style.display = 'none'; llmPanel.style.display = 'none'; return;
        }
        const difference = forecastScore - currentScore;
        let statusText;
        if (difference > 0.1) statusText = t.statusBetter;
        else if (difference < -0.1) statusText = t.statusWorse;
        else statusText = t.statusSame;
        let llmSuggestion;
        if (forecastScore <= 51) llmSuggestion = t.llmBad;
        else if (forecastScore <= 55) llmSuggestion = t.llmMedium;
        else llmSuggestion = t.llmGood;
        document.getElementById('forecast-header').textContent = t.forecastHeader(t.seasons[quarter]);
        document.getElementById('forecast-text').textContent = t.forecastComparison(Math.abs(difference).toFixed(2), statusText);
        document.getElementById('llm-header').textContent = t.llmHeader;
        document.getElementById('llm-suggestion-text').textContent = llmSuggestion;
        forecastPanel.style.display = 'block';
        llmPanel.style.display = 'block';
    }


    function updateAdvancedInfoPanel() {
        const forecastPanel = document.getElementById('forecast-comparison');
        const llmPanel = document.getElementById('llm-recommendation');
        const t = translations[currentLang];
        forecastPanel.style.display = 'none'; llmPanel.style.display = 'none';

        if (!selectedFeature) return;

        const cityName = selectedFeature.properties.name;
        const currentScore = currentScores[cityName];
        let scoreToAnalyze = currentScore;
        let isForecast = dataCache[currentYear]?.type === 'forecast';

        if (currentMonth !== 'all' && !isForecast && forecastData2027) {
            const cityForecasts = forecastData2027.scores[cityName];
            if (cityForecasts && typeof currentScore === 'number') {
                const month = parseInt(currentMonth, 10);
                let quarter;
                if (month >= 1 && month <= 3) quarter = 'q1'; else if (month >= 4 && month <= 6) quarter = 'q2';
                else if (month >= 7 && month <= 9) quarter = 'q3'; else quarter = 'q4';
                const forecastScore = cityForecasts[quarter];
                if (typeof forecastScore === 'number') {
                    const difference = forecastScore - currentScore;
                    let statusText = (difference > 0.1) ? t.statusBetter : (difference < -0.1) ? t.statusWorse : t.statusSame;
                    document.getElementById('forecast-header').textContent = t.forecastHeader(t.seasons[quarter]);
                    document.getElementById('forecast-text').textContent = t.forecastComparison(Math.abs(difference).toFixed(2), statusText);
                    forecastPanel.style.display = 'block';
                }
            }
        }
        if (isForecast) { scoreToAnalyze = currentScore; }

        if (scoreToAnalyze === undefined || scoreToAnalyze === null) return;
        let category;
        if (scoreToAnalyze <= 51) category = 'poor'; else if (scoreToAnalyze <= 55) category = 'average'; else category = 'good';
        const response = llmResponses[currentLang][category];
        
        document.getElementById('llm-analysis-header').textContent = response.ANALYSIS_HEADER;
        document.getElementById('llm-general-situation').textContent = cityName + response.GENERAL_SITUATION;
        document.getElementById('llm-gov-header').textContent = response.STRATEGIES_FOR_LOCAL_GOV_HEADER;
        document.getElementById('llm-citizen-header').textContent = response.RECOMMENDATIONS_FOR_CITIZENS_HEADER;
        const govList = document.getElementById('llm-gov-strategies');
        govList.innerHTML = response.STRATEGIES.map(item => `<li>${item}</li>`).join('');
        const citizenList = document.getElementById('llm-citizen-recs');
        citizenList.innerHTML = response.CITIZEN_RECS.map(item => `<li>${item}</li>`).join('');
        llmPanel.style.display = 'block';
    }

    async function handleMonthChange() {
        const yearData = dataCache[currentYear];
        if (!yearData) { updateMap(yearlyScores[currentYear] || {}); return; }
        let scoresToShow = {};
        if (yearData.type === 'monthly') {
            if (currentMonth === 'all') { scoresToShow = yearlyScores[currentYear]; }
            else { Object.keys(yearlyScores[currentYear] || {}).forEach(city => { const monthlyDataForCity = yearData.scores[city]; const selectedMonthScore = monthlyDataForCity ? monthlyDataForCity[parseInt(currentMonth, 10)] : undefined; if (selectedMonthScore !== undefined) { scoresToShow[city] = selectedMonthScore; } else { scoresToShow[city] = yearlyScores[currentYear][city]; } }); }
        } else if (yearData.type === 'forecast') {
            const month = parseInt(currentMonth, 10);
            if (currentMonth === 'all') { Object.keys(yearData.scores).forEach(city => { const cityScores = Object.values(yearData.scores[city]); if (cityScores.length > 0) { scoresToShow[city] = parseFloat((cityScores.reduce((a, b) => a + b, 0) / cityScores.length).toFixed(2)); } });
            } else {
                let quarter;
                if (month >= 1 && month <= 3) quarter = 'q1'; else if (month >= 4 && month <= 6) quarter = 'q2';
                else if (month >= 7 && month <= 9) quarter = 'q3'; else quarter = 'q4';
                Object.keys(yearData.scores).forEach(city => { scoresToShow[city] = yearData.scores[city] ? yearData.scores[city][quarter] : undefined; });
            }
        }
        updateMap(scoresToShow);
        updateLanguageUI();
    }
    
    function setupEventListeners() {
        document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', (e) => { currentLang = e.currentTarget.getAttribute('data-lang'); document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); updateLanguageUI(); }));
        document.querySelectorAll('.year-tab').forEach(tab => { tab.addEventListener('click', async function() { document.querySelectorAll('.year-tab').forEach(t => t.classList.remove('active')); this.classList.add('active'); currentYear = +this.getAttribute('data-year'); await fetchAndCacheYearData(currentYear); await handleMonthChange(); }); });
        document.querySelector('.month-tabs').addEventListener('click', (event) => { const clickedTab = event.target.closest('.month-tab'); if (!clickedTab) return; document.querySelectorAll('.month-tabs .month-tab').forEach(tab => tab.classList.remove('active')); clickedTab.classList.add('active'); currentMonth = clickedTab.getAttribute('data-month'); handleMonthChange(); });
        document.querySelectorAll('.chatbot-btn').forEach(btn => btn.addEventListener('click', function() { const queryKey = this.getAttribute('data-query'); const queryText = translations[currentLang].chatbotButtons[queryKey]; sendMessage(queryText); }));
        document.querySelectorAll('.left-tab').forEach(tab => tab.addEventListener('click', function() { const tabId = this.getAttribute('data-tab'); document.querySelectorAll('.left-tab').forEach(t => t.classList.remove('active')); this.classList.add('active'); document.getElementById('info-tab').style.display = tabId === 'info' ? 'block' : 'none'; document.getElementById('ranking-tab').style.display = tabId === 'ranking' ? 'block' : 'none'; if (tabId === 'ranking') { updateRankingTable(currentScores); } }));
        document.getElementById('reset-map').addEventListener('click', () => { selectedFeature = null; svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity); g.selectAll('path').classed('selected', false).style('opacity', 1); const t = translations[currentLang]; document.getElementById('chatbot-content').innerHTML = `<div id="chatbot-welcome" style="font-size:12px; color:#bbb;">${t.chatbotWelcome}</div>`; updateLanguageUI(); });
        document.getElementById('toggle-left').addEventListener('click', () => document.getElementById('left-panel').classList.toggle('collapsed'));
        document.getElementById('toggle-controls').addEventListener('click', () => document.getElementById('controls').classList.toggle('collapsed'));
        document.getElementById('chatbot-send').addEventListener('click', () => sendMessage());
        document.getElementById('chatbot-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }
    
    function resizeCanvas() {
        const wrap = document.getElementById('map-wrap'); if (!wrap) return;
        canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight;
        stars = [];
        for (let i = 0; i < 200; i++) { stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 1.5, alpha: Math.random(), dAlpha: (Math.random() * 0.02 - 0.01) }); }
    }
    
    function drawStars() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "white";
        stars.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.globalAlpha = star.alpha; ctx.fill(); star.alpha += star.dAlpha; if (star.alpha <= 0 || star.alpha >= 1) { star.dAlpha *= -1; } });
        requestAnimationFrame(drawStars);
    }

    const projection = d3.geoMercator().fitSize([800, 700], geojson);
    const path = d3.geoPath().projection(projection);
    g.selectAll('path').data(geojson.features).join('path').attr('d', path).attr('stroke', '#030b1a').attr('stroke-width', 0.5).style('cursor', 'pointer')
        .on('click', (event, d) => onFeatureClick(d, event.currentTarget))
        .on('mouseover', function(event, d) { if (selectedFeature !== d) { d3.select(this).style('opacity', 0.8); } })
        .on('mouseout', function(event, d) { if (selectedFeature !== d) { d3.select(this).style('opacity', 1); } });
    
    setupEventListeners();
    updateLanguageUI();
    updateMap(currentScores);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawStars();
}
initializeApp();