# main.py (Final Sürüm)

import pandas as pd
from datetime import date, datetime
from typing import List, Optional

from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
from sqlalchemy.orm import selectinload

# --- 1. VERİTABANI KURULUMU ---
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, echo=False)

# --- 2. VERİTABANI MODELLERİ (TAM TANIMLARIYLA) ---
class MonthlyScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    year: int
    month: int
    score: float
    city_id: Optional[int] = Field(default=None, foreign_key="city.id")
    city: Optional["City"] = Relationship(back_populates="monthly_scores")

class ForecastScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    year: int
    quarter: int 
    score: float
    city_id: Optional[int] = Field(default=None, foreign_key="city.id")
    city: Optional["City"] = Relationship(back_populates="forecast_scores")

class DailyData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    data_date: date
    no2: Optional[float] = None
    temp_day: Optional[float] = None
    temp_night: Optional[float] = None
    precipitation: Optional[float] = None
    city_id: Optional[int] = Field(default=None, foreign_key="city.id")
    city: Optional["City"] = Relationship(back_populates="daily_data")

class City(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    monthly_scores: List[MonthlyScore] = Relationship(back_populates="city")
    forecast_scores: List[ForecastScore] = Relationship(back_populates="city")
    daily_data: List[DailyData] = Relationship(back_populates="city")

# --- Veritabanı Yardımcı Fonksiyonları ---
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# --- 3. FASTAPI UYGULAMASI ---
app = FastAPI(title="Türkiye Ekolojik Harita API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- 4. BAŞLANGIÇTA VERİTABANINI DOLDURMA (TAM FONKSİYON) ---
def populate_database_from_csvs(session: Session):
    if session.exec(select(City)).first():
        print("Veritabanı zaten dolu, başlangıç verileri atlanıyor.")
        return
    print("Veritabanı boş, CSV'lerden veriler okunuyor...")
    
    cities_cache = {}
    def get_or_create_city(city_name: str):
        city_name_stripped = city_name.strip()
        if city_name_stripped in cities_cache:
            return cities_cache[city_name_stripped]
        db_city = session.exec(select(City).where(City.name == city_name_stripped)).first()
        if not db_city:
            db_city = City(name=city_name_stripped)
            session.add(db_city)
            session.commit()
            session.refresh(db_city)
        cities_cache[city_name_stripped] = db_city
        return db_city

    try:
        df_monthly = pd.read_csv("EcoPulse_Skorlari_AYLIK_2020-2025_Temizlenmis.csv")
        df_monthly.columns = [col.lower().strip() for col in df_monthly.columns]
        date_series = pd.to_datetime(df_monthly['tarih'])
        df_monthly['yil'] = date_series.dt.year
        df_monthly['ay'] = date_series.dt.month
        for _, row in df_monthly.iterrows():
            db_city = get_or_create_city(row['sehir'])
            monthly_score = MonthlyScore(city_id=db_city.id, year=row['yil'], month=row['ay'], score=row['aylik_ortalama_ecopulse'])
            session.add(monthly_score)
        print("SUCCESS: Aylık veriler başarıyla işlendi.")
    except Exception as e:
        print(f"UYARI: Aylık veriler işlenemedi. Hata: {e}")

    try:
        df_forecast = pd.read_csv("EcoPulse_2027_Tahminleri_2020-2025_Verisiyle.csv")
        df_forecast.columns = [col.lower().strip() for col in df_forecast.columns]
        df_forecast['tarih'] = pd.to_datetime(df_forecast['tahmin_tarihi'])
        for _, row in df_forecast.iterrows():
            db_city = get_or_create_city(row['sehir'])
            month = row['tarih'].month
            quarter = (month - 1) // 3 + 1
            forecast = ForecastScore(city_id=db_city.id, year=row['tarih'].year, quarter=quarter, score=row['tahmini_ecopulse_skoru'])
            session.add(forecast)
        print("SUCCESS: Tahmin verileri başarıyla işlendi.")
    except Exception as e:
        print(f"UYARI: Tahmin verileri işlenemedi. Hata: {e}")
        
    try:
        df_daily = pd.read_csv("EcoPulse_Skorlari_GUNLUK_2020-2025_Temizlenmis.csv")
        df_daily.columns = [col.lower().strip() for col in df_daily.columns]
        df_daily['tarih'] = pd.to_datetime(df_daily['tarih']).dt.date
        for _, row in df_daily.iterrows():
            db_city = get_or_create_city(row['sehir'])
            daily = DailyData(city_id=db_city.id, data_date=row['tarih'], no2=row.get('no2_skoru'), temp_day=row.get('sicaklik_gunduz_c'), temp_night=row.get('sicaklik_gece_c'), precipitation=row.get('yagis_mm_gun'))
            session.add(daily)
        print("SUCCESS: Günlük veriler başarıyla işlendi.")
    except Exception as e:
        print(f"UYARI: Günlük veriler işlenemedi. Hata: {e}")

    session.commit()
    print("Veri aktarımı tamamlandı.")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        populate_database_from_csvs(session)

# --- 5. GÜNCELLENMİŞ API ENDPOINT'LERİ ---
@app.get("/api/scores/yearly")
def get_yearly_average_scores(session: Session = Depends(get_session)):
    scores_by_year = {}
    monthly_scores = session.exec(select(MonthlyScore).options(selectinload(MonthlyScore.city))).all()
    yearly_avg = {}
    for s in monthly_scores:
        key = (s.city.name, s.year)
        if key not in yearly_avg: yearly_avg[key] = []
        yearly_avg[key].append(s.score)
    for (name, year), scores in yearly_avg.items():
        avg = round(sum(scores) / len(scores), 2)
        if str(year) not in scores_by_year: scores_by_year[str(year)] = {}
        scores_by_year[str(year)][name] = avg
    return scores_by_year

@app.get("/api/scores/{year}")
def get_scores_for_year(year: int, session: Session = Depends(get_session)):
    if year >= 2027: # Tahmin yılı veya sonrası
        forecasts = session.exec(select(ForecastScore).where(ForecastScore.year == year).options(selectinload(ForecastScore.city))).all()
        data = {"type": "forecast", "scores": {}}
        for f in forecasts:
            if f.city.name not in data["scores"]: data["scores"][f.city.name] = {}
            data["scores"][f.city.name][f"q{f.quarter}"] = f.score
        return data
    else: # Geçmiş yıl
        scores = session.exec(select(MonthlyScore).where(MonthlyScore.year == year).options(selectinload(MonthlyScore.city))).all()
        data = {"type": "monthly", "scores": {}}
        for s in scores:
            if s.city.name not in data["scores"]: data["scores"][s.city.name] = {}
            data["scores"][s.city.name][s.month] = s.score
        return data

@app.get("/api/daily/{city_name}")
def get_daily_data_for_today(city_name: str, session: Session = Depends(get_session)):
    today = datetime.now().date()
    city = session.exec(select(City).where(City.name == city_name)).first()
    if not city: return JSONResponse(status_code=404, content={"message": "City not found"})
    daily_data = session.exec(select(DailyData).where(DailyData.city_id == city.id, DailyData.data_date == today)).first()
    if not daily_data: return JSONResponse(status_code=404, content={"message": "No data for today"})
    return daily_data

# --- 6. FRONTEND SUNMA ---
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
@app.get("/")
async def read_index(): return FileResponse('frontend/index.html')