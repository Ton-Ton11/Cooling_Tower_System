export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-lg border border-transparent bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white transition duration-150 ease-in-out hover:bg-[#1D4ED8] focus:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:ring-offset-1 active:bg-[#1E40AF] ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
