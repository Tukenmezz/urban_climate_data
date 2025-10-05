#  EcoPulse — Tracking Türkiye's Ecological Pulse

**EcoPulse** is an artificial intelligence project that analyzes environmental data obtained from **NASA EarthData** to calculate the “ecological pulse” of cities across Türkiye and provide future-oriented environmental predictions.  
This project was developed as part of the **NASA Space Apps Challenge**.

---

##  Project Objective

Our goal is to monitor environmental variables across Türkiye, evaluate the current ecological condition of cities, and predict their future risk levels.  
This way, urban planners, researchers, and citizens can take proactive measures against environmental risks.

---

##  Data Sources

Data are obtained from **[NASA EarthData](https://earthdata.nasa.gov/)**.  
The main environmental parameters analyzed are:

-  **Air pollution (AOD data)**
-  **Precipitation amount**
-  **Daytime and nighttime surface temperatures**
-  **Vegetation (NDVI) / Green area data**

Each city’s data are processed to calculate its **EcoPulse Score**.

---

##  LLM Model (Gemini 2.5 Flash)

The AI model used in this project:
- **Model:** Gemini 2.5 Flash (Google DeepMind)
- **Purpose:**  
  - Generate predictions for future years based on environmental data  
  - Provide city-level suggestions and solution strategies  
  - Explain ecological risk factors  

Gemini is integrated into the Python backend to learn from historical data and generate natural language insights and recommendations.

---

##  Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Python |
| **LLM API** | Gemini 2.5 Flash |
| **Data Source** | NASA EarthData (MODIS, GPM, NDVI, etc.) |
| **Visualization** | Folium, Reflex, Plotly |

---

##  Setup

###  Required Libraries
```bash
pip install pandas numpy folium reflex requests google-generativeai
```

###  Add Data
Place the `.nc4` or `.csv` data files downloaded from NASA EarthData into the `/data` folder.

###  Run the Project
```bash
python main.py
```
Then open in your browser:  
`http://localhost:3000`

---

##  How It Works

1. **Data Collection:** Environmental data are retrieved from NASA EarthData API.  
2. **Preprocessing:** Data are cleaned and categorized by city using Python.  
3. **EcoPulse Calculation:** NDVI, temperature, precipitation, and air pollution scores are combined into a single ecological score.  
4. **LLM Prediction:** The Gemini model generates forecasts and recommendations about cities' future environmental conditions.  
5. **Interface:** The Reflex + HTML/CSS interface visualizes the results on an interactive map.

---

##  Example Output

> **Istanbul (EcoPulse Score: 72/100)**  
>  A rising temperature trend is observed.  
>  Air quality is moderate.  
>  Green area ratio has decreased by 4% in the last 5 years.  
>  *Suggestion:* Sustainable green area planning should be implemented by 2030.

---

##  Contributors

- **KTÜ NeXT Gen Developers Team**  
- Project Leader: Mert Can Şiran  
- Fields: Artificial Intelligence, Data Science, Web Development

---

##  Future Plans

-  Integrate more environmental data sources  
-  Add a mobile interface  
-  Expand the model for more complex multivariable predictions  

---

##  Contributions

Anyone interested can open a PR or share ideas in the `issues` section.  
Thanks to the NASA Space Apps jury and the environmental data community! 

---

**EcoPulse — “Listen to the Earth’s Pulse, Shape the Future.” **

---

#  EcoPulse — Türkiye'nin Ekolojik Nabzını Tutuyoruz

**EcoPulse**, NASA EarthData kaynaklarından alınan çevresel verileri analiz ederek Türkiye’deki şehirlerin “ekolojik nabzını” hesaplayan ve geleceğe yönelik çevresel tahminler sunan bir yapay zekâ projesidir.  
Bu proje, **NASA Space Apps Challenge** kapsamında geliştirilmiştir.

---

##  Proje Amacı

Türkiye genelinde çevresel değişkenleri izleyip, şehirlerin mevcut ekolojik durumunu ve gelecekteki risk seviyelerini tahmin etmeyi hedefliyoruz.  
Böylece şehir planlamacıları, araştırmacılar ve vatandaşlar çevresel risklere karşı proaktif önlemler alabilecekler.

---

##  Kullandığımız Veriler

Veriler **[NASA EarthData](https://earthdata.nasa.gov/)** platformundan alınmıştır.  
Analiz ettiğimiz temel çevresel parametreler:

-  **Hava kirliliği (AOD verileri)**
-  **Yağış miktarı**
-  **Gece ve gündüz yüzey sıcaklıkları**
-  **Vejetasyon (NDVI) / Yeşil alan verileri**

Bu veriler her şehir için analiz edilerek **EcoPulse Skoru** hesaplanır.

---

##  LLM Modeli (Gemini 2.5 Flash)

Projede kullanılan yapay zekâ modeli:
- **Model:** Gemini 2.5 Flash (Google DeepMind)
- **Amaç:**  
  - Çevresel verilerden gelecek yıllar için tahminler üretmek  
  - Şehir bazında öneriler ve çözüm stratejileri sunmak  
  - Ekolojik risk faktörlerini açıklamak

Gemini, Python tarafında entegre edilerek hem geçmiş verileri öğrenir hem de kullanıcıya doğal dilde öneriler döner.

---

##  Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji |
|--------|------------|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Python |
| **LLM API** | Gemini 2.5 Flash |
| **Veri Kaynağı** | NASA EarthData (MODIS, GPM, NDVI vb.) |
| **Veri Görselleştirme** | Folium, Reflex, Plotly |

---

##  Kurulum (Setup)

###  Gerekli Kütüphaneler
```bash
pip install pandas numpy folium reflex requests google-generativeai
```

###  Verilerin Eklenmesi
NASA EarthData’dan indirilen `.nc4` veya `.csv` verilerini `/data` klasörüne yerleştirin.

###  Çalıştırma
```bash
python main.py
```
Tarayıcıdan şu adresi açın:  
`http://localhost:3000`

---

##  Nasıl Çalışıyor?

1. **Veri Toplama:** NASA EarthData API üzerinden veriler çekilir.  
2. **Ön İşleme:** Python ile temizlenir, şehir bazında sınıflandırılır.  
3. **EcoPulse Hesaplama:** NDVI, sıcaklık, yağış ve hava kirliliği skorlarından birleşik bir ekolojik skor hesaplanır.  
4. **LLM Tahmin:** Gemini modeli, bu skorlara göre şehirlerin gelecekteki durumları hakkında tahminler ve öneriler üretir.  
5. **Arayüz:** Reflex + HTML/CSS ile oluşturulan interaktif harita üzerinden şehirlerin durumu görselleştirilir.

---

##  Örnek Çıktı

> **İstanbul (EcoPulse Skoru: 72/100)**  
>  Sıcaklık artışı trendi gözlemleniyor.  
>  Hava kalitesi orta seviyede.  
>  Yeşil alan oranı son 5 yılda %4 azaldı.  
>  *Öneri:* 2030’a kadar sürdürülebilir yeşil alan planlaması yapılmalı.

---

##  Geliştirenler

- **KTÜ NeXT Gen Developers Team**  
- Proje Lideri: Mert Can Şiran  
- Alan: Yapay Zekâ, Veri Bilimi, Web Geliştirme

---

##  Gelecek Planları

-  Daha fazla çevresel veri kaynağını entegre etmek  
-  Mobil arayüz eklemek  
-  Modeli daha kapsamlı çok değişkenli tahminlere uygun hale getirmek  

---

##  Katkılar

Katkı sağlamak isteyenler PR açabilir veya `issues` bölümünde önerilerini paylaşabilir.  
NASA Space Apps jürisi ve çevresel veri topluluğuna teşekkürler! 

---

**EcoPulse — “Dünyanın Nabzını Dinle, Geleceği Şekillendir.” **
