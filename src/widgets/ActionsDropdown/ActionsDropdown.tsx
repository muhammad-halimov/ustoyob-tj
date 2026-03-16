import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IoEllipsisVertical } from 'react-icons/io5';
import styles from './ActionsDropdown.module.scss';

export interface DropdownItem {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    hidden?: boolean;
}

interface ActionsDropdownProps {
    items: DropdownItem[];
    className?: string;
    style?: React.CSSProperties;
    buttonAriaLabel?: string;
}

export const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
    items,
    className,
    style,
    buttonAriaLabel = 'Меню',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    const calcPosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
        setDropdownStyle({
            position: 'fixed',
            right: window.innerWidth - rect.right,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
            zIndex: 9999,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        calcPosition();
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
                !(e.target as HTMLElement).closest('[data-actions-dropdown-portal]')
            ) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => setIsOpen(false);
        document.addEventListener('mousedown', handleOutsideClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, calcPosition]);

    const visibleItems = items.filter(item => !item.hidden);

    if (visibleItems.length === 0) return null;

    return (
        <div className={`${styles.wrapper}${className ? ' ' + className : ''}`} style={style}>
            <button
                ref={buttonRef}
                className={styles.button}
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={buttonAriaLabel}
            >
                <IoEllipsisVertical />
            </button>
            {isOpen && createPortal(
                <div
                    data-actions-dropdown-portal
                    className={styles.dropdown}
                    style={dropdownStyle}
                >
                    {visibleItems.map((item, index) => (
                        <button
                            key={index}
                            className={`${styles.item}${item.danger ? ' ' + styles.itemDanger : ''}`}
                            onClick={() => {
                                setIsOpen(false);
                                item.onClick();
                            }}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default ActionsDropdown;
