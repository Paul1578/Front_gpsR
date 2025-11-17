/**
 * @figmaAssetKey 577a47336f7236dbb76ce3e9a49d5176321476d2
 */
function Component1({ className }: { className?: string }) {
  return (
    <div className={className} data-name="Component 1">
      <div className="absolute bg-white inset-0 rounded-[17px]" />
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold inset-[22.66%_36.36%_72.27%_36.07%] leading-[normal] not-italic text-[32px] text-black">Login</p>
      <div className="absolute contents inset-[38.15%_11.73%_54.04%_11.44%]">
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[38.15%_52.2%_57.68%_11.44%] leading-[normal] not-italic text-[16px] text-black">Usuario</p>
        <div className="absolute inset-[41.02%_11.73%_54.04%_11.44%] rounded-[6px]">
          <div aria-hidden="true" className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]" />
        </div>
      </div>
      <div className="absolute contents inset-[51.3%_11.73%_40.88%_11.44%]">
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal inset-[51.3%_52.2%_44.53%_11.44%] leading-[normal] not-italic text-[16px] text-black">Contraseña</p>
        <div className="absolute inset-[54.17%_11.73%_40.88%_11.44%] rounded-[6px]">
          <div aria-hidden="true" className="absolute border border-[#958dbc] border-solid inset-0 pointer-events-none rounded-[6px]" />
        </div>
      </div>
      <div className="absolute contents inset-[66.54%_11.73%_27.86%_11.44%]">
        <div className="absolute bg-[#3271a4] inset-[66.54%_11.73%_27.86%_11.44%] rounded-[6px]">
          <div aria-hidden="true" className="absolute border-[#4384d8] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[6px]" />
        </div>
        <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[68.1%_34.9%_29.43%_34.6%] leading-[normal] not-italic text-[16px] text-nowrap text-white whitespace-pre">Iniciar Sesión</p>
      </div>
      <div className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold inset-[89.84%_24.05%_5.21%_23.75%] leading-[normal] not-italic text-[#3271a4] text-[16px] text-center text-nowrap whitespace-pre">
        <p className="mb-0">¿Olvidaste tu usuario o</p>
        <p>contraseña?</p>
      </div>
    </div>
  );
}

export default function Component2() {
  return <Component1 className="relative size-full" />;
}