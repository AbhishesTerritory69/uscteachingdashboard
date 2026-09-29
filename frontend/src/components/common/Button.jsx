export default function Button({ children, variant = 'primary', type = 'button', ...props }) {
  const className = ['btn', variant !== 'primary' ? variant : '', props.className]
    .filter(Boolean)
    .join(' ')

  return <button {...props} type={type} className={className}>{children}</button>
}