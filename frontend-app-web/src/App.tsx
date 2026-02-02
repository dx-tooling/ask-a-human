import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { Feed } from "@/pages/Feed";
import { AnswerQuestion } from "@/pages/AnswerQuestion";
import { Confirmation } from "@/pages/Confirmation";
import { Settings } from "@/pages/Settings";

function App() {
    return (
        <ThemeProvider defaultTheme="dark">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Feed />} />
                    <Route path="/questions/:id" element={<AnswerQuestion />} />
                    <Route path="/confirmation" element={<Confirmation />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
