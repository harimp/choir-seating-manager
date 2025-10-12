import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.scss';

export function Home() {
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate session code
    const trimmedCode = sessionCode.trim();
    
    if (!trimmedCode) {
      setError('Please enter a session code');
      return;
    }

    if (trimmedCode.length > 50) {
      setError('Session code must be 50 characters or less');
      return;
    }

    // Navigate to the session
    navigate(`/${trimmedCode}`);
  };

  return (
    <div className="home">
      <div className="home-container">
        <div className="home-header">
          <h1>Choir Seating Manager</h1>
          <p className="subtitle">Load your choir session to manage seating arrangements</p>
        </div>

        <form className="home-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sessionCode">Session Code</label>
            <input
              type="text"
              id="sessionCode"
              className="session-input"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              placeholder="e.g., spring-2024"
              maxLength={50}
              autoFocus
            />
            <p className="input-hint">
              Enter the session code provided by your choir director
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="load-button">
            Load Session
          </button>
        </form>

        <div className="home-footer">
          <p className="help-text">
            Need help? Contact your choir director for the session code.
          </p>
        </div>
      </div>
    </div>
  );
}
