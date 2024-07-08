import React from 'react';
import VideoStream from './components/VideoStream';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #000000;
`;

const App = () => {
  return (
    <Container>
      <VideoStream signalingServerUrl="wss://175.121.80.129:5555" />
    </Container>
  );
};

export default App;
