import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  Phone,
  Mail,
  UserCheck,
  ArrowRight,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { UserButton } from '@clerk/react';
import { Logo } from '../branding/Logo';
import { SCHOOL_INFO } from '../../constants/data';
import { useAppAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academicsDropdownOpen, setAcademicsDropdownOpen] = useState(false);
  const [mobileAcademicsOpen, setMobileAcademicsOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { isConfigured, isLoaded, isSignedIn, user, signOut } = useAppAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAcademicsDropdownOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { 
      name: 'Academics', 
      path: '/academics',
      hasDropdown: true,
      children: [
        { name: 'Academics Overview', path: '/academics' },
        { name: 'Creche (Early Years)', path: '/academics/creche' },
        { name: 'Primary School', path: '/academics/primary' },
        { name: 'Secondary School', path: '/academics/secondary' },
      ]
    },
    { name: 'Admissions', path: '/admissions' },
    { name: 'School Life', path: '/school-life' },
    { name: 'News & Events', path: '/news' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md py-2.5' : 'bg-white py-4 shadow-sm'}`}>
      {/* Top utility bar */}
      <div className="hidden lg:block bg-[#091C30] text-slate-300 text-xs py-1.5 px-4 mb-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href={`tel:${SCHOOL_INFO.phone}`} className="flex items-center gap-1.5 hover:text-[#D9B76A] transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#D9B76A]" />
              <span>{SCHOOL_INFO.phone}</span>
            </a>
            <a href={`mailto:${SCHOOL_INFO.email}`} className="flex items-center gap-1.5 hover:text-[#D9B76A] transition-colors">
              <Mail className="w-3.5 h-3.5 text-[#D9B76A]" />
              <span>{SCHOOL_INFO.email}</span>
            </a>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">{SCHOOL_INFO.hours}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#D9B76A] font-medium tracking-wide">{SCHOOL_INFO.levels}</span>
            {isConfigured && isLoaded && isSignedIn ? (
              <div className="flex items-center gap-2.5">
                <NavLink
                  to="/portal"
                  className="flex items-center gap-1.5 bg-[#102B46] hover:bg-[#1e3a8a] text-white px-3 py-1 rounded text-xs font-semibold transition-colors border border-[#D9B76A]/40"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#D9B76A]" />
                  <span>{user?.firstName ? `${user.firstName}'s Portal` : 'My Portal'}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#D9B76A]" />
                  <span>Sign Out</span>
                </button>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-6 h-6 border border-[#D9B76A]',
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/portal/register"
                  className="flex items-center gap-1 text-slate-300 hover:text-[#D9B76A] px-2.5 py-1 rounded text-xs font-medium transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#D9B76A]" />
                  <span>Parent Sign Up</span>
                </NavLink>
                <NavLink
                  to="/portal/login"
                  className="flex items-center gap-1.5 bg-[#102B46] hover:bg-[#1e3a8a] text-white px-3 py-1 rounded text-xs font-semibold transition-colors border border-[#D9B76A]/40"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#D9B76A]" />
                  <span>Portal Sign In</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Logo variant="horizontal" />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => {
            if (link.hasDropdown) {
              return (
                <div 
                  key={link.name}
                  className="relative group"
                  onMouseEnter={() => setAcademicsDropdownOpen(true)}
                  onMouseLeave={() => setAcademicsDropdownOpen(false)}
                >
                  <button 
                    onClick={() => navigate(link.path)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${location.pathname.startsWith('/academics') ? 'text-[#102B46] bg-[#F5F3ED]' : 'text-slate-700 hover:text-[#102B46] hover:bg-slate-50'}`}
                  >
                    <span>{link.name}</span>
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-200" />
                  </button>

                  {academicsDropdownOpen && (
                    <div className="absolute top-full left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeIn">
                      {link.children?.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) => `block px-4 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-700 hover:bg-[#F5F3ED] hover:text-[#102B46]'}`}
                        >
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'text-[#102B46] bg-[#F5F3ED]' : 'text-slate-700 hover:text-[#102B46] hover:bg-slate-50'}`}
              >
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <NavLink
            to="/portal"
            className="lg:hidden flex items-center gap-1 text-[#102B46] hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-semibold"
          >
            Portal
          </NavLink>
          <NavLink
            to="/portal"
            className="flex items-center gap-2 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:shadow"
          >
            <span>Apply Now</span>
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
          <NavLink
            to="/portal"
            className="bg-[#D9B76A] text-[#102B46] px-3.5 py-2 rounded-lg font-bold text-xs shadow-sm"
          >
            Apply
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-2xl py-6 px-6 lg:hidden max-h-[85vh] overflow-y-auto animate-fadeIn">
          <div className="flex flex-col gap-2">
            <NavLink
              to="/"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              About Us
            </NavLink>

            {/* Academics expandable in mobile */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-base text-slate-800 hover:bg-slate-50">
                <NavLink to="/academics" className="flex-1">Academics</NavLink>
                <button 
                  onClick={() => setMobileAcademicsOpen(!mobileAcademicsOpen)}
                  className="p-1"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform ${mobileAcademicsOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {mobileAcademicsOpen && (
                <div className="flex flex-col pl-4 gap-1 mt-1 border-l-2 border-[#D9B76A]/40 ml-4">
                  <NavLink to="/academics" className="py-2 px-3 text-sm font-medium text-slate-700 hover:text-[#102B46]">Academics Overview</NavLink>
                  <NavLink to="/academics/creche" className="py-2 px-3 text-sm font-medium text-slate-700 hover:text-[#102B46]">Creche (Early Years)</NavLink>
                  <NavLink to="/academics/primary" className="py-2 px-3 text-sm font-medium text-slate-700 hover:text-[#102B46]">Primary School</NavLink>
                  <NavLink to="/academics/secondary" className="py-2 px-3 text-sm font-medium text-slate-700 hover:text-[#102B46]">Secondary School</NavLink>
                </div>
              )}
            </div>

            <NavLink
              to="/admissions"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              Admissions
            </NavLink>
            <NavLink
              to="/school-life"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              School Life
            </NavLink>
            <NavLink
              to="/news"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              News & Events
            </NavLink>
            <NavLink
              to="/gallery"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              Gallery
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) => `px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              Contact Us
            </NavLink>
            {isConfigured && isLoaded && isSignedIn ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-1">
                <div className="flex items-center justify-between px-4 py-2 bg-[#F5F3ED] rounded-xl">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#102B46] truncate">
                      {user?.fullName || 'Authenticated User'}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {user?.primaryEmail}
                    </div>
                  </div>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8 border border-[#D9B76A]',
                      },
                    }}
                  />
                </div>
                <NavLink
                  to="/portal"
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'bg-slate-100 text-[#102B46]'}`}
                >
                  <UserCheck className="w-5 h-5 text-[#D9B76A]" />
                  <span>My School Portal</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-base text-slate-700 hover:bg-slate-100 text-left"
                >
                  <LogOut className="w-5 h-5 text-[#102B46]" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-1">
                <NavLink
                  to="/portal/login"
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'bg-slate-100 text-[#102B46]'}`}
                >
                  <LogIn className="w-5 h-5 text-[#D9B76A]" />
                  <span>Portal Sign In</span>
                </NavLink>
                <NavLink
                  to="/portal/register"
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-base ${isActive ? 'bg-[#102B46] text-white' : 'bg-[#F5F3ED] text-[#102B46]'}`}
                >
                  <UserPlus className="w-5 h-5 text-[#102B46]" />
                  <span>Parent Registration</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#D9B76A]" />
              <span>{SCHOOL_INFO.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D9B76A]" />
              <span>{SCHOOL_INFO.email}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
