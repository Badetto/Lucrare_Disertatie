import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

export const NavBar: React.FC = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>RefactorAI</div>
      
      <NavLink 
        to="/" 
        end /* This ensures it is only active on the exact '/' path */
        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
      >
        Snippet Refactor
      </NavLink>
      
      <NavLink 
        to="/repository" 
        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
      >
        Repo Explorer
      </NavLink>

      {/* --- NEW: The Statistics/Dashboard Link --- */}
      <NavLink 
        to="/statistics" 
        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
      >
        📊 Statistics
      </NavLink>
    </nav>
  );
};