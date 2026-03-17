import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";

export const metadata = {
    title: "DWLR Groundwater Monitoring System",
    description:
        "Real-time groundwater level monitoring using Digital Water Level Recorder (DWLR) stations across India",
    keywords: [
        "DWLR",
        "groundwater",
        "monitoring",
        "water level",
        "India WRIS",
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Datatype:wght@100..900&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
            </head>
            <body>
                <Navbar />
                {children}
            </body>
        </html>
    );
}
