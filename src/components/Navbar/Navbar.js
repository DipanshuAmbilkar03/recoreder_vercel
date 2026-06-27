"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

const baseLinks = [
    { href: "/", label: "Home", icon: "" },
    { href: "/dashboard", label: "Dashboard", icon: "" },
    { href: "/map", label: "Map", icon: "" },
    { href: "/stations", label: "Stations", icon: "" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    useEffect(() => {
        // Read auth token from localStorage on mount
        const checkAuth = () => {
            const token = localStorage.getItem("admin_token");
            setIsAdminLoggedIn(!!token);
        };

        checkAuth();

        // Listen for login/logout events from other components
        window.addEventListener("admin-login", checkAuth);
        window.addEventListener("admin-logout", checkAuth);

        return () => {
            window.removeEventListener("admin-login", checkAuth);
            window.removeEventListener("admin-logout", checkAuth);
        };
    }, []);

    // Create current list of links
    const navLinks = [...baseLinks];
    if (isAdminLoggedIn) {
        navLinks.push({ href: "/sync", label: "Sync Data", icon: "🔄" });
    }

    return (
        <nav className={styles.nav}>
            <div className={`container ${styles.navInner}`}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoText}>DWLR Monitor</span>
                </Link>

                {/* Mobile Toggle */}
                <button 
                    className={styles.mobileToggle} 
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle Menu"
                >
                    <div className={`${styles.hamburger} ${isOpen ? styles.open : ""}`}></div>
                </button>

                <ul className={`${styles.links} ${isOpen ? styles.linksOpen : ""}`}>
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className={`${styles.link} ${pathname === link.href ? styles.active : ""} ${
                                    link.href === "/sync" ? styles.syncBtn : ""
                                }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className={styles.linkIcon}>{link.icon}</span>
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li className={styles.mobileOnly}>
                        <Link href="/admin" className={styles.loginBtn} onClick={() => setIsOpen(false)}>
                            {isAdminLoggedIn ? "Admin" : "Login"}
                        </Link>
                    </li>
                </ul>

                <div className={styles.desktopOnly}>
                    <div className={styles.actionRow}>
                        <Link href="/admin" className={styles.loginBtn}>
                            {isAdminLoggedIn ? "Admin" : "Login"}
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
