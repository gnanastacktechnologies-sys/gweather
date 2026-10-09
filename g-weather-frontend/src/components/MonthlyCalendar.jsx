import React, { useState, useEffect } from 'react';
import { getMonthlyCalendar } from '../services/weatherApi';

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

  const fetchCalendar = async (year, month) => {
    setLoading(true);
    try {
      const res = await getMonthlyCalendar(year, month);
      if (res.success) {
        setCalendarData(res);
      }
    } catch (err) {
      console.error('Calendar Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(selectedYear, selectedMonth);
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

  // Compute blank start cells for calendar grid alignment
  const getFirstDayOfWeek = (year, month) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const firstDayOffset = getFirstDayOfWeek(selectedYear, selectedMonth);
  const daysList = calendarData?.days || [];
  const summary = calendarData?.summary;

  const getRainStatusIcon = (status) => {
    switch (status) {
      case 'RAINING': return '🌧️';
      case 'LIKELY': return '🌦️';
      case 'POSSIBLE': return '⛅';
      case 'WATCH': return '🌤️';
      case 'DRY': return '☀️';
      default: return '➖';
    }
  };

  const getRainStatusClass = (status) => {
    switch (status) {
      case 'RAINING': return 'status-raining';
      case 'LIKELY': return 'status-likely';
      case 'POSSIBLE': return 'status-possible';
      case 'WATCH': return 'status-watch';
      case 'DRY': return 'status-dry';
      default: return 'status-nodata';
    }
  };

  return (
    <div className="card calendar-card">
      <div className="card-header calendar-header">
        <div className="calendar-title-group">
          <span className="card-icon">📅</span>
          <h2 className="card-title">G-WEATHER Monthly Calendar</h2>
        </div>
        
        <div className="calendar-controls">
          <button className="cal-nav-btn" onClick={handlePrevMonth} title="Previous Month">◀</button>
          <span className="cal-current-label">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
          <button className="cal-nav-btn" onClick={handleNextMonth} title="Next Month">▶</button>
        </div>
      </div>

      {/* Monthly Summary Aggregates */}
      {summary && (
        <div className="calendar-summary-bar">
          <div className="cal-stat-item">
            <span className="cal-stat-label">Rainy / Likely Days</span>
            <span className="cal-stat-value rain-text">🌧️ {summary.monthlyRainyDays} Days</span>
          </div>
          <div className="cal-stat-item">
            <span className="cal-stat-label">Avg Temp</span>
            <span className="cal-stat-value">{summary.avgMonthlyTemp !== null ? `${summary.avgMonthlyTemp}°C` : '--'}</span>
          </div>
          <div className="cal-stat-item">
            <span className="cal-stat-label">Temp Range</span>
            <span className="cal-stat-value">{summary.lowestTemp !== null ? `${summary.lowestTemp}°C - ${summary.highestTemp}°C` : '--'}</span>
          </div>
          <div className="cal-stat-item">
            <span className="cal-stat-label">Avg Humidity</span>
            <span className="cal-stat-value">{summary.avgMonthlyHumidity !== null ? `${summary.avgMonthlyHumidity}%` : '--'}</span>
          </div>
        </div>
      )}

      <div className="calendar-body">
        {loading ? (
          <div className="calendar-loading">Loading monthly weather records...</div>
        ) : (
          <div className="calendar-grid-wrapper">
            {/* Weekday headers */}
            <div className="calendar-weekdays-row">
              {WEEKDAY_NAMES.map(day => (
                <div key={day} className="calendar-weekday-header">{day}</div>
              ))}
            </div>

            {/* Grid of days */}
            <div className="calendar-days-grid">
              {/* Blank leading cells */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`blank-${i}`} className="calendar-day-cell cell-empty"></div>
              ))}

              {/* Day cells */}
              {daysList.map((dayObj) => {
                const isToday =
                  selectedYear === currentDate.getFullYear() &&
                  selectedMonth === (currentDate.getMonth() + 1) &&
                  dayObj.day === currentDate.getDate();

                return (
                  <div
                    key={`day-${dayObj.day}`}
                    className={`calendar-day-cell ${dayObj.hasData ? 'cell-active' : 'cell-nodata'} ${isToday ? 'cell-today' : ''}`}
                    onClick={() => dayObj.hasData && setSelectedDayDetail(dayObj)}
                  >
                    <div className="day-cell-header">
                      <span className="day-number">{dayObj.day}</span>
                      {dayObj.hasData && (
                        <span className={`day-status-pill ${getRainStatusClass(dayObj.rainStatus)}`}>
                          {getRainStatusIcon(dayObj.rainStatus)}
                        </span>
                      )}
                    </div>

                    {dayObj.hasData ? (
                      <div className="day-cell-content">
                        <div className="day-temp-range">
                          <span className="temp-high">{dayObj.maxTemp}°</span>
                          <span className="temp-low">{dayObj.minTemp}°</span>
                        </div>
                        <div className="day-rain-prob">
                          💧 {dayObj.maxRainProb}%
                        </div>
                      </div>
                    ) : (
                      <div className="day-cell-no-record">No data</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Details Modal */}
      {selectedDayDetail && (
        <div className="day-modal-overlay" onClick={() => setSelectedDayDetail(null)}>
          <div className="day-modal-content" onClick={e => e.stopPropagation()}>
            <div className="day-modal-header">
              <h3>📅 Daily Report: {selectedDayDetail.dateStr}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedDayDetail(null)}>✕</button>
            </div>
            <div className="day-modal-body">
              <div className="modal-metric-grid">
                <div className="modal-metric-card">
                  <span className="modal-metric-title">Rain Status</span>
                  <span className="modal-metric-value">
                    {getRainStatusIcon(selectedDayDetail.rainStatus)} {selectedDayDetail.rainStatus}
                  </span>
                </div>
                <div className="modal-metric-card">
                  <span className="modal-metric-title">Max Rain Probability</span>
                  <span className="modal-metric-value">{selectedDayDetail.maxRainProb}%</span>
                </div>
                <div className="modal-metric-card">
                  <span className="modal-metric-title">Temperature (Min / Max / Avg)</span>
                  <span className="modal-metric-value">
                    {selectedDayDetail.minTemp}°C / {selectedDayDetail.maxTemp}°C ({selectedDayDetail.avgTemp}°C avg)
                  </span>
                </div>
                <div className="modal-metric-card">
                  <span className="modal-metric-title">Average Humidity</span>
                  <span className="modal-metric-value">{selectedDayDetail.avgHumidity}%</span>
                </div>
                <div className="modal-metric-card">
                  <span className="modal-metric-title">Total Records Received</span>
                  <span className="modal-metric-value">{selectedDayDetail.readingsCount} packets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
