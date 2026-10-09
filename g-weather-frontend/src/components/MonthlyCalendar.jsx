import React, { useState, useEffect } from 'react';
import { getMonthlyCalendar } from '../services/weatherApi';
import { CalendarIcon, SunIcon, RainIcon, CloudRainIcon } from './Icons';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function MonthlyCalendar() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const fetchCalendar = async (year = selectedYear, month = selectedMonth, showLoading = true) => {
    if (showLoading && !calendarData) setLoading(true);
    try {
      const res = await getMonthlyCalendar(year, month);
      if (res && res.success) {
        setCalendarData(res);
      }
    } catch (err) {
      console.error('Calendar Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(selectedYear, selectedMonth, true);

    // Auto-poll calendar updates every 15 seconds so live telemetry updates immediately
    const interval = setInterval(() => {
      fetchCalendar(selectedYear, selectedMonth, false);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getFirstDayOfWeek = (year, month) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const firstDayOffset = getFirstDayOfWeek(selectedYear, selectedMonth);
  const daysList = calendarData?.days || [];
  const summary = calendarData?.summary;

  const renderRainStatusIcon = (status) => {
    switch (status) {
      case 'RAINING': return <CloudRainIcon className="pill-svg icon-rose" />;
      case 'LIKELY': return <CloudRainIcon className="pill-svg icon-cyan" />;
      case 'POSSIBLE': return <RainIcon className="pill-svg icon-purple" />;
      case 'WATCH': return <SunIcon className="pill-svg icon-amber" />;
      default: return <SunIcon className="pill-svg icon-emerald" />;
    }
  };

  const getRainStatusClass = (status) => {
    switch (status) {
      case 'RAINING': return 'status-badge-raining';
      case 'LIKELY': return 'status-badge-likely';
      case 'POSSIBLE': return 'status-badge-possible';
      case 'WATCH': return 'status-badge-watch';
      default: return 'status-badge-dry';
    }
  };

  return (
    <div className="card calendar-card">
      {/* Header Controls */}
      <div className="calendar-card-header">
        <div className="calendar-title-group">
          <div className="icon-badge"><CalendarIcon className="card-svg icon-cyan" /></div>
          <div>
            <div className="title-row-chip">
              <h2 className="calendar-main-title">Weather Calendar</h2>
              <span className="live-pulse-chip">LIVE UPDATES</span>
            </div>
            <span className="calendar-sub-title">Monthly Climate & Rain Summary</span>
          </div>
        </div>

        <div className="calendar-nav-controls">
          <button className="cal-nav-btn" onClick={handlePrevMonth} title="Previous Month">◀</button>
          <span className="cal-month-display">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
          <button className="cal-nav-btn" onClick={handleNextMonth} title="Next Month">▶</button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      {summary && (
        <div className="calendar-kpi-bar">
          <div className="kpi-pill">
            <span className="kpi-label">Rainy / Likely Days</span>
            <span className="kpi-value text-cyan">🌧️ {summary.monthlyRainyDays} Days</span>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Avg Temp</span>
            <span className="kpi-value text-amber">{summary.avgMonthlyTemp !== null ? `${summary.avgMonthlyTemp}°C` : '--'}</span>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Temp Range</span>
            <span className="kpi-value">{summary.lowestTemp !== null ? `${summary.lowestTemp}° - ${summary.highestTemp}°C` : '--'}</span>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Avg Humidity</span>
            <span className="kpi-value text-emerald">{summary.avgMonthlyHumidity !== null ? `${summary.avgMonthlyHumidity}%` : '--'}</span>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="calendar-grid-container">
        {loading ? (
          <div className="state-container loading-state" style={{ padding: '30px' }}>
            <div className="spinner"></div>
            <span>Loading monthly weather records...</span>
          </div>
        ) : (
          <div className="calendar-matrix">
            {/* Weekday Labels */}
            <div className="weekday-header-row">
              {WEEKDAY_NAMES.map((day) => (
                <div key={day} className="weekday-cell">{day}</div>
              ))}
            </div>

            {/* Matrix Days */}
            <div className="month-days-grid">
              {/* Empty offset cells */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`blank-${i}`} className="day-card day-card-empty"></div>
              ))}

              {/* Real Days */}
              {daysList.map((dayObj) => {
                const isToday =
                  selectedYear === currentDate.getFullYear() &&
                  selectedMonth === (currentDate.getMonth() + 1) &&
                  dayObj.day === currentDate.getDate();

                return (
                  <div
                    key={`day-${dayObj.day}`}
                    className={`day-card ${dayObj.hasData ? 'day-card-active' : 'day-card-nodata'} ${isToday ? 'day-card-today' : ''}`}
                    onClick={() => dayObj.hasData && setSelectedDayDetail(dayObj)}
                  >
                    <div className="day-top-bar">
                      <span className="day-num">{dayObj.day}</span>
                      {dayObj.hasData && (
                        <span className={`day-status-icon ${getRainStatusClass(dayObj.rainStatus)}`}>
                          {renderRainStatusIcon(dayObj.rainStatus)}
                        </span>
                      )}
                    </div>

                    {dayObj.hasData ? (
                      <div className="day-info-block">
                        <div className="day-temps">
                          <span className="high-t">{dayObj.maxTemp}°</span>
                          <span className="temp-sep">/</span>
                          <span className="low-t">{dayObj.minTemp}°</span>
                        </div>
                        <div className="day-rain-prob">
                          💧 {dayObj.maxRainProb}%
                        </div>
                      </div>
                    ) : (
                      <div className="day-empty-text">--</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Details Popup Modal */}
      {selectedDayDetail && (
        <div className="day-modal-backdrop" onClick={() => setSelectedDayDetail(null)}>
          <div className="day-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="day-modal-card-header">
              <div className="modal-title-wrap">
                <div className="icon-badge"><CalendarIcon className="card-svg icon-cyan" /></div>
                <h3>Daily Weather Log: {selectedDayDetail.dateStr}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDayDetail(null)}>✕</button>
            </div>

            <div className="day-modal-grid">
              <div className="modal-info-box">
                <span className="box-lbl">Rain Classification</span>
                <span className="box-val flex-val">
                  {renderRainStatusIcon(selectedDayDetail.rainStatus)}
                  <span>{selectedDayDetail.rainStatus}</span>
                </span>
              </div>

              <div className="modal-info-box">
                <span className="box-lbl">Max Rain Chance</span>
                <span className="box-val text-cyan">{selectedDayDetail.maxRainProb}%</span>
              </div>

              <div className="modal-info-box">
                <span className="box-lbl">Temperature Range</span>
                <span className="box-val text-amber">
                  {selectedDayDetail.minTemp}°C to {selectedDayDetail.maxTemp}°C
                </span>
              </div>

              <div className="modal-info-box">
                <span className="box-lbl">Average Humidity</span>
                <span className="box-val text-emerald">{selectedDayDetail.avgHumidity}%</span>
              </div>

              <div className="modal-info-box span-2">
                <span className="box-lbl">Telemetry Readings Ingested</span>
                <span className="box-val">{selectedDayDetail.readingsCount} packets logged</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
