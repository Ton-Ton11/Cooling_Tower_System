import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-lg border-[#E2E8F0] bg-white text-[#172B4D] placeholder:text-[#94A3B8] shadow-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-sm ' +
                className
            }
            ref={localRef}
        />
    );
});
