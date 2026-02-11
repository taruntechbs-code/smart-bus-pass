export default function Particles() {
    return (
        <div className="particles">
            {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} />
            ))}
        </div>
    );
}
