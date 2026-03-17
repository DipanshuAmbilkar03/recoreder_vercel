"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./Navbar.module.css";

const navLinks = [
    { href: "/", label: "Home", icon: "" },
    { href: "/dashboard", label: "Dashboard", icon: "" },
    { href: "/map", label: "Map" ,icon:""},
    { href: "/stations", label: "Stations", icon: "" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className={styles.nav}>
            <div className={`container ${styles.navInner}`}>
                <Link href="/" className={styles.logo}>
                    {/* <span className={styles.logoIcon}></span> */}
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
                                className={`${styles.link} ${pathname === link.href ? styles.active : ""
                                    }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className={styles.linkIcon}>{link.icon}</span>
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li className={styles.mobileOnly}>
                         <Link href="/login" className={styles.loginBtn}>
                            Login
                        </Link>
                    </li>
                </ul>

                <div className={styles.desktopOnly}>
                    <div className={styles.actionRow}>
                        <Link href="/login" className={styles.loginBtn}>
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
