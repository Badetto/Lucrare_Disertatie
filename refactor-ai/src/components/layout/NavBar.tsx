import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

export const NavBar: React.FC = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>RefactorAI</div>
      
      <NavLink 
        to="/" 
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
    </nav>
  );
};