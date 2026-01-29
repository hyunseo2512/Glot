import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * 전역 툴팁 컴포넌트
 * data-tooltip 속성을 가진 요소에 마우스를 올리면 툴팁을 표시합니다.
 * data-tooltip-pos="left" | "right" | "top" | "bottom" (기본값: bottom/auto)
 */
export const GlobalTooltip = () => {
    const [tooltip, setTooltip] = useState<{
        text: string;
        x: number;
        y: number;
        visible: boolean;
    }>({ text: '', x: 0, y: 0, visible: false });

    const targetRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const handleMouseOver = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('[data-tooltip]');
            if (target) {
                targetRef.current = target as HTMLElement;
                const text = targetRef.current.getAttribute('data-tooltip') || '';

                // 위치 계산을 위해 잠시 상태 업데이트 (visible: true 이후 레이아웃 이펙트에서 위치 보정 가능하지만
                // 여기서는 마우스 위치가 아닌 요소 위치 기준으로 계산)
                updatePosition(target as HTMLElement, text);
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('[data-tooltip]');
            if (target) {
                setTooltip(prev => ({ ...prev, visible: false }));
                targetRef.current = null;
            }
        };

        // 스크롤 시 툴팁 숨김 (선택사항)
        const handleScroll = () => {
            if (tooltip.visible) setTooltip(prev => ({ ...prev, visible: false }));
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('mousedown', handleScroll); // Click also hides

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('mousedown', handleScroll);
        };
    }, []);

    // Check if target is still valid (DOM removal check)
    useEffect(() => {
        if (!tooltip.visible || !targetRef.current) return;

        const interval = setInterval(() => {
            if (targetRef.current && !targetRef.current.isConnected) {
                setTooltip(prev => ({ ...prev, visible: false }));
                targetRef.current = null;
            }
        }, 100);

        return () => clearInterval(interval);
    }, [tooltip.visible]);

    const updatePosition = (element: HTMLElement, text: string) => {
        const rect = element.getBoundingClientRect();
        const pos = element.getAttribute('data-tooltip-pos') || 'right'; // 사이드바 기본값 right 추천

        let x = 0;
        let y = 0;
        const gap = 8;

        // 툴팁 예상 크기 (대략) - 실제 렌더링 후 보정이 완벽하지만 간단히 계산
        // 텍스트 길이에 따라 다름. 일단 중앙 정렬 후 화면 Clamp logic 적용

        // 기본 위치 잡기
        if (pos === 'right') {
            x = rect.right + gap;
            y = rect.top + rect.height / 2;
        } else if (pos === 'left') {
            x = rect.left - gap;
            y = rect.top + rect.height / 2;
        } else if (pos === 'bottom') {
            x = rect.left + rect.width / 2;
            y = rect.bottom + gap;
        } else { // top
            x = rect.left + rect.width / 2;
            y = rect.top - gap;
        }

        setTooltip({ text, x, y, visible: true });
    };

    if (!tooltip.visible || !tooltip.text) return null;

    return createPortal(
        <div
            className="custom-tooltip"
            style={{
                position: 'fixed',
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(0, -50%)', // Right/Left 기준 y중앙 정렬
                // 동적 스타일링은 CSS 모듈이나 인라인으로 보완
                zIndex: 100000,
                pointerEvents: 'none',
            }}
            ref={(node) => {
                if (node) {
                    // 화면 밖 나감 방지 (Clamping)
                    const rect = node.getBoundingClientRect();
                    const padding = 10;
                    const elementDir = targetRef.current?.getAttribute('data-tooltip-pos') || 'right';

                    let newX = tooltip.x;
                    let newY = tooltip.y;

                    // 방향별 트랜스폼 베이스 조정
                    if (elementDir === 'top' || elementDir === 'bottom') {
                        node.style.transform = 'translate(-50%, 0)'; // X 중앙 정렬
                    } else {
                        node.style.transform = 'translate(0, -50%)'; // Y 중앙 정렬
                    }

                    // Re-measure after transform reset (logical approximation)
                    // 사실 transform 때문에 getBoundingClientRect가 변환된 값을 리턴함.

                    // 간단한 Clamping 로직
                    if (rect.right > window.innerWidth - padding) {
                        newX = window.innerWidth - rect.width - padding;
                        node.style.left = `${newX}px`;
                        node.style.transform = 'none'; // Clamping 시 중앙 정렬 해제하고 직접 좌표 제어
                        // Y값은 유지하되, Y도 벗어나면 조정
                        node.style.top = `${tooltip.y - rect.height / 2}px`; // Center vertically manually
                    }
                    // ... 더 정교한 로직은 필요시 추가
                }
            }}
        >
            {tooltip.text}
        </div>,
        document.body
    );
};
