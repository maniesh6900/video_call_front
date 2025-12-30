import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Index from './components/CreateCalls';
import JoinCalls from './components/JoinCalls';

function App() {
  return (<>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Index/>}/>
        <Route path='/join' element={<JoinCalls/>}/>
      </Routes>
    </BrowserRouter>
  
  </>
  );
}

export default App;