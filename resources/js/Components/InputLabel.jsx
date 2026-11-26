export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-xs font-semibold text-[#172B4D] ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
