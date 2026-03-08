'use client';

import { Menu } from '@headlessui/react';
import { MessageSquareText, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function clsx(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Header() {
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-6 pt-5">
            <nav
                className="flex items-center justify-between w-full max-w-[1100px] bg-white/95 backdrop-blur-xl"
                style={{
                    borderRadius: '100px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 2px 20px -4px rgba(0,0,0,0.06)',
                    padding: '10px 10px 10px 24px',
                }}
            >
                {/* ── Left: Logo ───────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none" />
                        </svg>
                    </div>
                    <span className="text-[16px] font-bold tracking-tight text-[#1a1a1a]">
                        CivicPulse
                    </span>
                </div>

                {/* ── Center: Navigation ───────────────────────────────────── */}
                <div className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#555]">
                    <a href="#" className="hover:text-[#1a1a1a] transition-colors">{t('home')}</a>

                    {/* Features Dropdown */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="flex items-center gap-1 hover:text-[#1a1a1a] transition-colors outline-none cursor-pointer">
                            {t('features')} <ChevronDown size={13} className="opacity-40" />
                        </Menu.Button>
                        <Menu.Items className="absolute left-1/2 -translate-x-1/2 mt-4 w-48 origin-top rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                                {({ active }) => (
                                    <button className={clsx("flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] text-left", active ? "bg-gray-50 text-black" : "text-gray-600")}>
                                        {t('how_it_works')}
                                    </button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button className={clsx("flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] text-left", active ? "bg-gray-50 text-black" : "text-gray-600")}>
                                        {t('knowledge_base')}
                                    </button>
                                )}
                            </Menu.Item>
                        </Menu.Items>
                    </Menu>

                    {/* Services Dropdown */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="flex items-center gap-1 hover:text-[#1a1a1a] transition-colors outline-none cursor-pointer">
                            {t('services')} <ChevronDown size={13} className="opacity-40" />
                        </Menu.Button>
                        <Menu.Items className="absolute left-1/2 -translate-x-1/2 mt-4 w-48 origin-top rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                                {({ active }) => (
                                    <button className={clsx("flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] text-left", active ? "bg-gray-50 text-black" : "text-gray-600")}>
                                        {t('live_mode')}
                                    </button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button className={clsx("flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] text-left", active ? "bg-gray-50 text-black" : "text-gray-600")}>
                                        {t('scan_documents')}
                                    </button>
                                )}
                            </Menu.Item>
                            <hr className="my-1 border-gray-100" />
                            <Menu.Item>
                                {({ active }) => (
                                    <button className={clsx("flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] font-semibold text-left", active ? "text-blue-600 bg-blue-50" : "text-blue-600")}>
                                        {t('scan_now')}
                                    </button>
                                )}
                            </Menu.Item>
                        </Menu.Items>
                    </Menu>

                    <a href="#contact" className="hover:text-[#1a1a1a] transition-colors">{t('contact')}</a>
                </div>

                {/* ── Right: Actions ───────────────────────────────────────── */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Language Switcher */}
                    <button
                        onClick={toggleLanguage}
                        title={`Language: ${i18n.language.toUpperCase()}`}
                        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                        <MessageSquareText size={17} strokeWidth={1.8} />
                    </button>

                    {/* Auth */}
                    <button className="hidden sm:inline-flex px-5 py-2.5 text-[13px] font-medium text-[#1a1a1a] rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer">
                        {t('log_in')}
                    </button>
                    <button className="hidden sm:inline-flex px-5 py-2.5 text-[13px] font-medium text-white bg-[#1a1a1a] rounded-full hover:bg-black transition-all cursor-pointer">
                        {t('create_account')}
                    </button>
                </div>
            </nav>
        </header>
    );
}
