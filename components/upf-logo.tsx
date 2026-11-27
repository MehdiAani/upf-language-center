interface UpfLogoProps {
  className?: string
  showSubword?: boolean
}

export function UpfLogo({
  className = 'h-9 w-auto',
  showSubword = false,
}: UpfLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={showSubword ? '0 0 590.64 128.54' : '0 0 590.64 90'}
      className={className}
      role="img"
      aria-label="UPF Centre de Langues, Culture et Soft Skills"
    >
      <g>
        <g>
          <rect
            className="fill-[#ef8122]"
            x="284.12"
            y="1.14"
            width="3.12"
            height="86.14"
          />
          <text
            className="fill-slate-900 font-serif text-[22.05px] font-bold tracking-wide transition-colors dark:fill-[#ef8122]"
            transform="translate(300.36 23.87)"
          >
            CENTRE
          </text>
          <text
            className="fill-slate-900 font-serif text-[22.05px] font-bold tracking-wide transition-colors dark:fill-[#ef8122]"
            transform="translate(300.36 50.3)"
          >
            DE LANGUES
          </text>
          <text
            className="fill-slate-900 font-serif text-[22.05px] font-bold tracking-wide transition-colors dark:fill-[#ef8122]"
            transform="translate(300.36 76.72)"
          >
            <tspan x="0" y="0">
              CU
            </tspan>
            <tspan x="31.46" y="0" letterSpacing="-0.05em">
              L
            </tspan>
            <tspan x="44.22" y="0">
              TURE ET SOFT SKILLS
            </tspan>
          </text>
        </g>

        <g className="fill-[#ef8122]">
          <path d="m83.69,83.19H2.25V.29h81.43v82.9ZM59.16,13.68c.79,1.65,2.06,3.06,2.07,4.49.13,10.51.03,21.03-.02,31.54-.04,7.62-4.32,10.43-10.84,11.25-4.24.54-8.61.29-12.91.09-7.48-.35-11.49-4.7-11.52-12.22-.03-9.03-.07-18.06.04-27.09.03-2.61.59-5.22.94-8.1h-14.42c2.82,1.33,2.33,3.8,2.34,6.04.01,10.22-.25,20.45.08,30.66.28,8.49,3.4,14.77,12.46,17.37,7.09,2.04,14.43,2.2,21.73,1.56,4.09-.36,8.25-1.01,12.13-2.27,6.36-2.08,10.37-8.95,10.38-16.74.02-11.4,0-22.81,0-33.93.74-1.03,1.27-1.78,1.89-2.65h-14.36Z" />
          <path d="m175.12,0h81.94v55.71h-27v26.93c-4.5,1.57-52.63,1.11-54.95-.38V0Zm18.07,14.03c.37,1.81.95,3.35.95,4.89.07,14.5.08,28.99,0,43.49-.01,2.12-.52,4.23-.8,6.34h14.46c-.89-.93-1.43-1.49-1.7-1.79v-22.29c6.51,0,12.75-.02,18.98,0,2.87.01,6.04-.78,7.73,2.68v-12.17c-8.91,2.77-17.79.77-26.86,1.51v-14.69c1.48,0,2.66,0,3.84,0,9.73,0,19.46-.08,29.19.05,2.4.03,4.79.75,7.42,1.19.08-3.34,1.61-7.24-.16-10.55-3.49.49-6.45,1.23-9.43,1.26-13.6.13-27.21.06-40.81.06-1.06,0-2.12,0-2.83,0Z" />
          <path d="m89.03,83.13V.18h81.06v82.95h-81.06Zm26.21-36.49c1.33,0,2.2,0,3.08,0,9.38-.1,18.8.71,28.08-1.41,5.36-1.23,10.08-3.5,11.64-9.24.76-2.79.67-5.87.63-8.81-.05-4.02-1.93-7.24-5.29-9.44-3.9-2.55-8.24-3.73-12.9-3.73-11.9.02-23.81.01-35.71.01-1.04,0-2.07,0-3.54,0,1.31,1.08,2.17,1.79,2.9,2.39v50.31c-.91.68-1.77,1.33-2.9,2.18h16.01c-.7-1.23-1.86-2.34-1.9-3.48-.18-6.13-.09-12.27-.09-18.79Z" />
          <path d="m262.56,60.82v27.61h-27.95v-27.61h27.95Z" />
          <path d="m115.42,36.93v-13.78c.73-.19,1.28-.45,1.84-.46,7.73-.01,15.47-.11,23.2.07,4.04.09,6.17,1.78,7.02,4.77.92,3.24.04,6.59-2.46,8.21-1.19.77-2.7,1.43-4.07,1.45-8.13.13-16.25.07-24.38.05-.28,0-.57-.15-1.15-.31Z" />
        </g>

        {showSubword && (
          <text
            className="fill-[#ef8122]/80 font-sans text-[41.53px] dark:fill-[#efac72]"
            transform="translate(0 116.82)"
          >
            University
          </text>
        )}
      </g>
    </svg>
  )
}