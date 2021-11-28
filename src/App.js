import './App.css';
import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Login from "./components/pages/Login";
import SignUp from "./components/pages/SignUp";
import {Container} from "@mui/material";
import API from "./api";
import Main from "./components/pages/Main";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route exact path="/login" element={<Login />} />
                <Route exact path="/signup" element={<SignUp />} />
                <Route exact path="/" element={<Main />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
