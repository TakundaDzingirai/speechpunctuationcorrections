import './App.css';
import SpeechPractice from './component/SpeechPractice';

function App() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <SpeechPractice />
      </div>
    </div>
  );
}

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#f4f4f9', // Light background
  textAlign: 'center',
};

const cardStyle = {
  backgroundColor: '#fff',
  padding: '30px 40px',
  borderRadius: '10px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Card shadow
  maxWidth: '600px', // Limit card width
  width: '100%',
};

export default App;
