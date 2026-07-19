"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

const baseLinks = [
    { href: "/", label: "Home" },
    { href: "/map", label: "Map" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/terrain", label: "Terrain" },
    { href: "/analytics", label: "Analytics" },
    { href: "/stations", label: "Stations" },
];

function isActive(pathname, href) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
    const pathname = usePathname() || "/";
    const [isOpen, setIsOpen] = useState(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = () => setIsAdminLoggedIn(!!localStorage.getItem("admin_token"));
        checkAuth();
        window.addEventListener("admin-login", checkAuth);
        window.addEventListener("admin-logout", checkAuth);
        return () => {
            window.removeEventListener("admin-login", checkAuth);
            window.removeEventListener("admin-logout", checkAuth);
        };
    }, []);

    const navLinks = [...baseLinks];
    if (isAdminLoggedIn) navLinks.push({ href: "/admin", label: "Admin" });

    return (
        <nav className={styles.nav}>
            <div className={`container ${styles.navInner}`}>
                <Link href="/" className={styles.logo} onClick={() => setIsOpen(false)}>
                    <span className={styles.logoText}>DWLR Monitor</span>
                </Link>

                <button
                    className={styles.mobileToggle}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle Menu"
                    aria-expanded={isOpen}
                >
                    <div className={`${styles.hamburger} ${isOpen ? styles.open : ""}`} />
                </button>

                <ul className={`${styles.links} ${isOpen ? styles.linksOpen : ""}`}>
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className={`${styles.link} ${isActive(pathname, link.href) ? styles.active : ""} ${
                                    link.href === "/admin" ? styles.syncBtn : ""
                                }`}
                                onClick={() => setIsOpen(false)}
                            >
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
