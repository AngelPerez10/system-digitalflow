import React, { useState } from  "react";

const demoMails = [
  { subject: "Material UI", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "12:16 pm", badge: "Importante" },
  { subject: "Wise", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "12:16 pm" },
  { subject: "Search Console", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Abr, 24", badge: "Social" },
  { subject: "PayPal", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Abr, 20" },
  { subject: "Google Meet", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Abr, 16" },
  { subject: "Loom", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Mar, 10" },
  { subject: "Airbnb", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Mar, 05" },
  { subject: "Facebook", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Feb, 25" },
  { subject: "Instagram", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Feb, 20", badge: "Promocional" },
  { subject: "Google", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Feb, 02" },
  { subject: "FormBold", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Ene, 22" },
  { subject: "GrayGrids", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Feb, 25" },
  { subject: "UIdeck", content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Assumenda dolor dolore esse modi nesciunt, nobis numquam sed sequi sunt totam!", time: "Feb, 15" },
];

const CorreoPage: React.FC = () => {
  const [selectedMails, setSelectedMails] = useState<Set<number>>(new Set());
  const [starredMails, setStarredMails] = useState<Set<number>>(new Set());

  const toggleSelectAll = () => {
    if (selectedMails.size === demoMails.length) {
      setSelectedMails(new Set());
    } else {
      setSelectedMails(new Set(demoMails.map((_, index) => index)));
    }
  };

  const toggleSelectMail = (index: number) => {
    const newSelected = new Set(selectedMails);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMails(newSelected);
  };

  const toggleStarMail = (index: number) => {
    const newStarred = new Set(starredMails);
    if (newStarred.has(index)) {
      newStarred.delete(index);
    } else {
      newStarred.add(index);
    }
    setStarredMails(newStarred);
  };

  const allSelected = selectedMails.size === demoMails.length && demoMails.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-12 items-stretch">
      {/* Sidebar izquierdo (Mailboxes / Filtros / Labels) */}
      <aside className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Correo</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Bandeja de entrada</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white shadow-theme-xs hover:bg-brand-600">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 8.5C4 7.39543 4.89543 6.5 6 6.5H18C19.1046 6.5 20 7.39543 20 8.5V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V8.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 9L10.382 12.4553C11.3451 13.0746 12.6549 13.0746 13.618 12.4553L19 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Redactar</span>
          </button>
        </div>

        <div className="no-scrollbar mt-6 flex-1 space-y-6 overflow-y-auto pb-2 text-sm max-h-[calc(100vh-260px)]">
          {/* MAILBOX */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase leading-[18px] text-gray-700 dark:text-gray-400">
              Buzón
            </h3>
            <ul className="flex flex-col gap-1">
              {/* Inbox */}
              <li>
                <button className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-500 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.2996 1.12891C11.4713 1.12891 10.7998 1.80033 10.7996 2.62867L10.7996 3.1264V3.12659L10.7997 4.87507H6.14591C3.6031 4.87507 1.54175 6.93642 1.54175 9.47923V14.3207C1.54175 15.4553 2.46151 16.3751 3.5961 16.3751H6.14591H10.0001H16.2084C17.4511 16.3751 18.4584 15.3677 18.4584 14.1251V10.1251C18.4584 7.22557 16.1079 4.87507 13.2084 4.87507H12.2997L12.2996 3.87651H13.7511C14.5097 3.87651 15.1248 3.26157 15.1249 2.50293C15.125 1.74411 14.5099 1.12891 13.7511 1.12891H12.2996ZM3.04175 9.47923C3.04175 7.76485 4.43153 6.37507 6.14591 6.37507C7.8603 6.37507 9.25008 7.76485 9.25008 9.47923V14.8751H6.14591H3.5961C3.28994 14.8751 3.04175 14.6269 3.04175 14.3207V9.47923ZM10.7501 9.47923V14.8751H16.2084C16.6226 14.8751 16.9584 14.5393 16.9584 14.1251V10.1251C16.9584 8.054 15.2795 6.37507 13.2084 6.37507H9.54632C10.294 7.19366 10.7501 8.28319 10.7501 9.47923Z"
                      />
                    </svg>
                    <span>Bandeja de entrada</span>
                  </span>
                  <span className="text-xs text-brand-500 dark:text-brand-400">3</span>
                </button>
              </li>

              {/* Enviados */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.98481 2.44399C3.11333 1.57147 1.15325 3.46979 1.96543 5.36824L3.82086 9.70527C3.90146 9.89367 3.90146 10.1069 3.82086 10.2953L1.96543 14.6323C1.15326 16.5307 3.11332 18.4291 4.98481 17.5565L16.8184 12.0395C18.5508 11.2319 18.5508 8.76865 16.8184 7.961L4.98481 2.44399ZM3.34453 4.77824C3.0738 4.14543 3.72716 3.51266 4.35099 3.80349L16.1846 9.32051C16.762 9.58973 16.762 10.4108 16.1846 10.68L4.35098 16.197C3.72716 16.4879 3.0738 15.8551 3.34453 15.2223L5.19996 10.8853C5.21944 10.8397 5.23735 10.7937 5.2537 10.7473L9.11784 10.7473C9.53206 10.7473 9.86784 10.4115 9.86784 9.99726C9.86784 9.58304 9.53206 9.24726 9.11784 9.24726L5.25157 9.24726C5.2358 9.20287 5.2186 9.15885 5.19996 9.11528L3.34453 4.77824Z"
                      />
                    </svg>
                    <span>Enviados</span>
                  </span>
                </button>
              </li>

              {/* Borradores */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 7.06206V14.375C3.04175 14.6511 3.26561 14.875 3.54175 14.875H16.4584C16.7346 14.875 16.9584 14.6511 16.9584 14.375V7.06245L11.1443 11.1168C10.457 11.5961 9.54373 11.5961 8.85638 11.1168L3.04175 7.06206ZM16.9584 5.19262C16.9584 5.19341 16.9584 5.1942 16.9584 5.19498V5.20026C16.9572 5.22216 16.946 5.24239 16.9279 5.25501L10.2864 9.88638C10.1145 10.0062 9.8862 10.0062 9.71437 9.88638L3.07255 5.25485C3.05342 5.24151 3.04202 5.21967 3.04202 5.19636C3.042 5.15695 3.07394 5.125 3.11335 5.125H16.8871C16.9253 5.125 16.9564 5.15494 16.9584 5.19262ZM18.4584 5.21428V14.375C18.4584 15.4796 17.563 16.375 16.4584 16.375H3.54175C2.43718 16.375 1.54175 15.4796 1.54175 14.375V5.19498C1.54175 5.1852 1.54194 5.17546 1.54231 5.16577C1.55858 4.31209 2.25571 3.625 3.11335 3.625H16.8871C17.7549 3.625 18.4584 4.32843 18.4585 5.19622C18.4585 5.20225 18.4585 5.20826 18.4584 5.21428Z"
                      />
                    </svg>
                    <span>Borradores</span>
                  </span>
                </button>
              </li>

              {/* Spam */}
              <li>
                <button className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.2996 1.12891C11.4713 1.12891 10.7998 1.80033 10.7996 2.62867L10.7996 3.1264V3.12659L10.7997 4.87507H6.14591C3.6031 4.87507 1.54175 6.93642 1.54175 9.47923V14.3207C1.54175 15.4553 2.46151 16.3751 3.5961 16.3751H6.14591H10.0001H16.2084C17.4511 16.3751 18.4584 15.3677 18.4584 14.1251V10.1251C18.4584 7.22557 16.1079 4.87507 13.2084 4.87507H12.2997L12.2996 3.87651H13.7511C14.5097 3.87651 15.1248 3.26157 15.1249 2.50293C15.125 1.74411 14.5099 1.12891 13.7511 1.12891H12.2996ZM3.04175 9.47923C3.04175 7.76485 4.43153 6.37507 6.14591 6.37507C7.8603 6.37507 9.25008 7.76485 9.25008 9.47923V14.8751H6.14591H3.5961C3.28994 14.8751 3.04175 14.6269 3.04175 14.3207V9.47923ZM10.7501 9.47923V14.8751H16.2084C16.6226 14.8751 16.9584 14.5393 16.9584 14.1251V10.1251C16.9584 8.054 15.2795 6.37507 13.2084 6.37507H9.54632C10.294 7.19366 10.7501 8.28319 10.7501 9.47923Z"
                      />
                    </svg>
                    <span>Spam</span>
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">2</span>
                </button>
              </li>

              {/* Papelera */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M6.54118 3.7915C6.54118 2.54886 7.54854 1.5415 8.79118 1.5415H11.2078C12.4505 1.5415 13.4578 2.54886 13.4578 3.7915V4.0415H15.6249H16.6658C17.08 4.0415 17.4158 4.37729 17.4158 4.7915C17.4158 5.20572 17.08 5.5415 16.6658 5.5415H16.3749V16.2082C16.3749 17.4508 15.3676 18.4582 14.1249 18.4582H5.87492C4.63228 18.4582 3.62492 17.4508 3.62492 16.2082V5.5415H3.33325C2.91904 5.5415 2.58325 5.20572 2.58325 4.7915C2.58325 4.37729 2.91904 4.0415 3.33325 4.0415H4.37492H6.54118V3.7915ZM14.8749 13.2464V8.24638V5.5415H13.4578H12.7078H7.29118H6.54118H5.12492V8.24638V13.2464V16.2082C5.12492 16.6224 5.46071 16.9582 5.87492 16.9582H14.1249C14.5391 16.9582 14.8749 16.6224 14.8749 16.2082V13.2464ZM8.04118 4.0415H11.9578V3.7915C11.9578 3.37729 11.6221 3.0415 11.2078 3.0415H8.79118C8.37696 3.0415 8.04118 3.37729 8.04118 3.7915V4.0415ZM8.33325 7.99984C8.74747 7.99984 9.08325 8.33562 9.08325 8.74984V13.7498C9.08325 14.1641 8.74747 14.4998 8.33325 14.4998C7.91904 14.4998 7.58325 14.1641 7.58325 13.7498V8.74984C7.58325 8.33562 7.91904 7.99984 8.33325 7.99984ZM12.4166 8.74984C12.4166 8.33562 12.0808 7.99984 11.6666 7.99984C11.2524 7.99984 10.9166 8.33562 10.9166 8.74984V13.7498C10.9166 14.1641 11.2524 14.4998 11.6666 14.4998C12.0808 14.4998 12.4166 14.1641 12.4166 13.7498V8.74984Z"
                      />
                    </svg>
                    <span>Papelera</span>
                  </span>
                </button>
              </li>

              {/* Archivo */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1.54175 4.8335C1.54175 3.59085 2.54911 2.5835 3.79175 2.5835H16.2084C17.4511 2.5835 18.4584 3.59085 18.4584 4.8335V5.16683C18.4584 5.96477 18.0431 6.66569 17.4167 7.06517V15.1668C17.4167 16.4095 16.4094 17.4168 15.1667 17.4168H4.83341C3.59077 17.4168 2.58341 16.4095 2.58341 15.1668V7.06517C1.95711 6.66568 1.54175 5.96476 1.54175 5.16683V4.8335ZM4.08341 7.41683H15.9167V15.1668C15.9167 15.581 15.581 15.9168 15.1667 15.9168H4.83341C4.4192 15.9168 4.08341 15.581 4.08341 15.1668V7.41683ZM16.9584 5.16683C16.9584 5.58104 16.6226 5.91683 16.2084 5.91683H3.79175C3.37753 5.91683 3.04175 5.58104 3.04175 5.16683V4.8335C3.04175 4.41928 3.37753 4.0835 3.79175 4.0835H16.2084C16.6226 4.0835 16.9584 4.41928 16.9584 4.8335V5.16683ZM8.33341 9.04183C7.9192 9.04183 7.58341 9.37762 7.58341 9.79183C7.58341 10.206 7.9192 10.5418 8.33341 10.5418H11.6667C12.081 10.5418 12.4167 10.206 12.4167 9.79183C12.4167 9.37762 12.081 9.04183 11.6667 9.04183H8.33341Z"
                      />
                    </svg>
                    <span>Archivados</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          {/* FILTER */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase leading-[18px] text-gray-700 dark:text-gray-400">
              Filtros
            </h3>
            <ul className="flex flex-col gap-1">
              {/* Destacados */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9.99993 2.375C10.2854 2.375 10.5461 2.53707 10.6725 2.79308L12.7318 6.96563L17.3365 7.63473C17.619 7.67578 17.8537 7.87367 17.9419 8.14517C18.0301 8.41668 17.9565 8.71473 17.7521 8.914L14.4201 12.1619L15.2067 16.748C15.255 17.0293 15.1393 17.3137 14.9083 17.4815C14.6774 17.6493 14.3712 17.6714 14.1185 17.5386L9.99993 15.3733L5.88137 17.5386C5.62869 17.6714 5.32249 17.6493 5.09153 17.4815C4.86057 17.3137 4.7449 17.0293 4.79316 16.748L5.57974 12.1619L2.24775 8.914C2.04332 8.71473 1.96975 8.41668 2.05797 8.14517C2.14619 7.87367 2.3809 7.67578 2.66341 7.63473L7.2681 6.96563L9.32738 2.79308C9.45373 2.53707 9.71445 2.375 9.99993 2.375Z"
                      />
                    </svg>
                    <span>Destacados</span>
                  </span>
                </button>
              </li>

              {/* Importantes */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.2996 1.12891C11.4713 1.12891 10.7998 1.80033 10.7996 2.62867L10.7996 3.1264V3.12659L10.7997 4.87507H6.14591C3.6031 4.87507 1.54175 6.93642 1.54175 9.47923V14.3207C1.54175 15.4553 2.46151 16.3751 3.5961 16.3751H6.14591H10.0001H16.2084C17.4511 16.3751 18.4584 15.3677 18.4584 14.1251V10.1251C18.4584 7.22557 16.1079 4.87507 13.2084 4.87507H12.2997L12.2996 3.87651H13.7511C14.5097 3.87651 15.1248 3.26157 15.1249 2.50293C15.125 1.74411 14.5099 1.12891 13.7511 1.12891H12.2996ZM3.04175 9.47923C3.04175 7.76485 4.43153 6.37507 6.14591 6.37507C7.8603 6.37507 9.25008 7.76485 9.25008 9.47923V14.8751H6.14591H3.5961C3.28994 14.8751 3.04175 14.6269 3.04175 14.3207V9.47923ZM10.7501 9.47923V14.8751H16.2084C16.6226 14.8751 16.9584 14.5393 16.9584 14.1251V10.1251C16.9584 8.054 15.2795 6.37507 13.2084 6.37507H9.54632C10.294 7.19366 10.7501 8.28319 10.7501 9.47923Z"
                      />
                    </svg>
                    <span>Importantes</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          {/* LABELS */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase leading-[18px] text-gray-700 dark:text-gray-400">
              Etiquetas
            </h3>
            <ul className="flex flex-col gap-1">
              {/* Personal */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7567 3.89683C11.6331 3.72282 11.4696 3.58089 11.28 3.48289C11.0904 3.3849 10.8801 3.33367 10.6667 3.3335L3.33333 3.34016C2.59667 3.34016 2 3.93016 2 4.66683V11.3335C2 12.0702 2.59667 12.6602 3.33333 12.6602L10.6667 12.6668C11.1167 12.6668 11.5133 12.4435 11.7567 12.1035L14.6667 8.00016L11.7567 3.89683Z"
                        fill="#12B76A"
                      />
                    </svg>
                    <span>Personal</span>
                  </span>
                </button>
              </li>

              {/* Trabajo */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7567 3.89683C11.6331 3.72282 11.4696 3.58089 11.28 3.48289C11.0904 3.3849 10.8801 3.33367 10.6667 3.3335L3.33333 3.34016C2.59667 3.34016 2 3.93016 2 4.66683V11.3335C2 12.0702 2.59667 12.6602 3.33333 12.6602L10.6667 12.6668C11.1167 12.6668 11.5133 12.4435 11.7567 12.1035L14.6667 8.00016L11.7567 3.89683Z"
                        fill="#F04438"
                      />
                    </svg>
                    <span>Trabajo</span>
                  </span>
                </button>
              </li>

              {/* Pagos */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7567 3.89683C11.6331 3.72282 11.4696 3.58089 11.28 3.48289C11.0904 3.3849 10.8801 3.33367 10.6667 3.3335L3.33333 3.34016C2.59667 3.34016 2 3.93016 2 4.66683V11.3335C2 12.0702 2.59667 12.6602 3.33333 12.6602L10.6667 12.6668C11.1167 12.6668 11.5133 12.4435 11.7567 12.1035L14.6667 8.00016L11.7567 3.89683Z"
                        fill="#FD853A"
                      />
                    </svg>
                    <span>Pagos</span>
                  </span>
                </button>
              </li>

              {/* Facturas */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7567 3.89683C11.6331 3.72282 11.4696 3.58089 11.28 3.48289C11.0904 3.3849 10.8801 3.33367 10.6667 3.3335L3.33333 3.34016C2.59667 3.34016 2 3.93016 2 4.66683V11.3335C2 12.0702 2.59667 12.6602 3.33333 12.6602L10.6667 12.6668C11.1167 12.6668 11.5133 12.4435 11.7567 12.1035L14.6667 8.00016L11.7567 3.89683Z"
                        fill="#36BFFA"
                      />
                    </svg>
                    <span>Facturas</span>
                  </span>
                </button>
              </li>

              {/* Vacío */}
              <li>
                <button className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400">
                  <span className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7567 3.89683C11.6331 3.72282 11.4696 3.58089 11.28 3.48289C11.0904 3.3849 10.8801 3.33367 10.6667 3.3335L3.33333 3.34016C2.59667 3.34016 2 3.93016 2 4.66683V11.3335C2 12.0702 2.59667 12.6602 3.33333 12.6602L10.6667 12.6668C11.1167 12.6668 11.5133 12.4435 11.7567 12.1035L14.6667 8.00016L11.7567 3.89683Z"
                        fill="#6172F3"
                      />
                    </svg>
                    <span>Vacío</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </aside>

      {/* Panel principal de correos */}
      <section className="col-span-12 md:col-span-8 lg:col-span-9 flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
        {/* Barra de acciones + búsqueda */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* Checkbox general */}
            <button
              onClick={toggleSelectAll}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <span className={`relative inline-flex h-4 w-4 items-center justify-center rounded-sm border ${allSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-600'}`}>
                {allSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="white"
                      strokeWidth="1.6666"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>

            {/* Botón recargar */}
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.72763 4.33443C7.92401 3.6437 9.30836 3.34945 10.6823 3.49385C12.0562 3.63826 13.3491 4.2139 14.3757 5.13828C15.0468 5.74252 15.5815 6.4755 15.9517 7.28815L13.6069 6.49282C13.2147 6.35977 12.7888 6.5699 12.6557 6.96216C12.5227 7.35443 12.7328 7.78028 13.1251 7.91333L16.8227 9.16752C16.8668 9.18743 16.9129 9.20314 16.9605 9.21426L17.0868 9.25712C17.2752 9.32101 17.4813 9.30746 17.6597 9.21943C17.838 9.1314 17.9741 8.97611 18.038 8.78772L19.3816 4.82561C19.5147 4.43334 19.3045 4.0075 18.9122 3.87447C18.52 3.74145 18.0941 3.95161 17.9611 4.34388L17.2335 6.48938C16.783 5.5609 16.1553 4.72223 15.3794 4.02356C14.1174 2.88722 12.528 2.17958 10.839 2.00207C9.15012 1.82455 7.44834 2.18628 5.97763 3.03539C4.50692 3.88451 3.34277 5.17743 2.65203 6.72884C1.9613 8.28025 1.77944 10.0105 2.13252 11.6716C2.4856 13.3328 3.3555 14.8395 4.61753 15.9758C5.87957 17.1121 7.46894 17.8198 9.15788 17.9973C10.8468 18.1748 12.5486 17.8131 14.0193 16.964C14.378 16.7569 14.5009 16.2982 14.2938 15.9395C14.0867 15.5807 13.628 15.4578 13.2693 15.6649C12.0729 16.3557 10.6886 16.6499 9.31467 16.5055C7.94077 16.3611 6.64786 15.7855 5.62123 14.8611C4.5946 13.9367 3.88697 12.711 3.59974 11.3598C3.31252 10.0085 3.46046 8.60098 4.02235 7.33894C4.58424 6.07691 5.53125 5.02516 6.72763 4.33443Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Botón eliminar */}
            <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:flex">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.54118 3.7915C6.54118 2.54886 7.54854 1.5415 8.79118 1.5415H11.2078C12.4505 1.5415 13.4578 2.54886 13.4578 3.7915V4.0415H15.6249H16.6658C17.08 4.0415 17.4158 4.37729 17.4158 4.7915C17.4158 5.20572 17.08 5.5415 16.6658 5.5415H16.3749V13.2464V16.2082C16.3749 17.4508 15.3676 18.4582 14.1249 18.4582H5.87492C4.63228 18.4582 3.62492 17.4508 3.62492 16.2082V13.2464V8.24638V5.5415H3.33325C2.91904 5.5415 2.58325 5.20572 2.58325 4.7915C2.58325 4.37729 2.91904 4.0415 3.33325 4.0415H4.37492H6.54118V3.7915Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Botón mover */}
            <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:flex">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 5.5H16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.33301 9.3335H11.6663"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Botón más (solo ícono) */}
            <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:flex">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.2441 6C10.2441 5.0335 11.0276 4.25 11.9941 4.25H12.0041C12.9706 4.25 13.7541 5.0335 13.7541 6C13.7541 6.9665 12.9706 7.75 12.0041 7.75H11.9941C11.0276 7.75 10.2441 6.9665 10.2441 6ZM10.2441 18C10.2441 17.0335 11.0276 16.25 11.9941 16.25H12.0041C12.9706 16.25 13.7541 17.0335 13.7541 18C13.7541 18.9665 12.9706 19.75 12.0041 19.75H11.9941C11.0276 19.75 10.2441 18.9665 10.2441 18ZM11.9941 10.25C11.0276 10.25 10.2441 11.0335 10.2441 12C10.2441 12.9665 11.0276 13.75 11.9941 13.75H12.0041C12.9706 13.75 13.7541 12.9665 13.7541 12C13.7541 11.0335 12.9706 10.25 12.0041 10.25H11.9941Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="m20 20-2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 pl-9 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
          </div>
        </div>

        {/* Lista de correos */}
        <div className="flex-1 overflow-hidden">
          <div className="custom-scrollbar h-full overflow-auto max-h-[calc(100vh-260px)]">
            {demoMails.map((mail, index) => (
              <div
                key={index}
                className="flex cursor-pointer items-center border-b border-gray-100 px-4 py-3 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
              >
                {/* Columna 1: checkbox + estrella + remitente */}
                <div className="flex w-2/5 items-center gap-3 pr-4 sm:w-1/3">
                  <button
                    onClick={() => toggleSelectMail(index)}
                    className={`flex h-4 w-4 items-center justify-center rounded-sm border text-xs ${
                      selectedMails.has(index)
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedMails.has(index) && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="white"
                          strokeWidth="1.6666"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => toggleStarMail(index)}
                    className={`${
                      starredMails.has(index)
                        ? 'text-yellow-400'
                        : 'text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill={starredMails.has(index) ? 'currentColor' : 'transparent'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.99993 2.375C10.2854 2.375 10.5461 2.53707 10.6725 2.79308L12.7318 6.96563L17.3365 7.63473C17.619 7.67578 17.8537 7.87367 17.9419 8.14517C18.0301 8.41668 17.9565 8.71473 17.7521 8.914L14.4201 12.1619L15.2067 16.748C15.255 17.0293 15.1393 17.3137 14.9083 17.4815C14.6774 17.6493 14.3712 17.6714 14.1185 17.5386L9.99993 15.3733L5.88137 17.5386C5.62869 17.6714 5.32249 17.6493 5.09153 17.4815C4.86057 17.3137 4.7449 17.0293 4.79316 16.748L5.57974 12.1619L2.24775 8.914C2.04332 8.71473 1.96975 8.41668 2.05797 8.14517C2.14619 7.87367 2.3809 7.67578 2.66341 7.63473L7.2681 6.96563L9.32738 2.79308C9.45373 2.53707 9.71445 2.375 9.99993 2.375Z"
                      />
                    </svg>
                  </button>
                  <span className="truncate font-medium text-gray-800 dark:text-white/90">
                    {mail.subject}
                  </span>
                </div>

                {/* Columna 2 y 3: contenido + badge + hora alineados */}
                <div className="ml-auto flex w-3/5 items-center justify-between gap-3 text-gray-500 dark:text-gray-400 sm:w-2/3">
                  <p className="flex-1 truncate pr-2">{mail.content}</p>
                  {mail.badge && (
                    <span
                      className={`mr-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${mail.badge === "Importante"
                          ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                          : mail.badge === "Social"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                        }`}
                    >
                      {mail.badge}
                    </span>
                  )}
                  <span className="shrink-0 text-right text-[11px] text-gray-400 dark:text-gray-500">
                    {mail.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer paginación simple */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
          <p>Mostrando 1 de {demoMails.length}</p>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.29167 15.8335L12.5 10.6252L7.29167 5.41683"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CorreoPage;
