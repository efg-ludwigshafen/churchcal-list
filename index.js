function lpad(str, pad, len) {
  return (pad.repeat(len) + str).slice(-len);
}

const ical = require('node-ical');
const pdfkit = require('pdfkit');
const {createWriteStream} = require('fs');

const month_max_dates = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const month_names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const day_names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const FS = 14;
const FS_HEADLINE = FS * 1.25;
const RH = FS * 2;
const RW = 10;
const FONT_BOLD = 'fonts/SourceSansPro-Semibold.ttf';
const FONT_NORMAL = 'fonts/SourceSansPro-Light.ttf';

const ical_url = 'https://efg-lu.church.tools/?q=churchcal/ical';
const start_month = new Date().getMonth() + 1;
const pdf = new pdfkit;

const start_date = new Date();
start_date.setDate(1);
start_date.setMonth(start_month);
const end_date = new Date();
end_date.setMonth((start_month + 1) % 12);
end_date.setDate(month_max_dates[end_date.getMonth()]);
if (start_month + 1 > 11) {
  end_date.setFullYear(end_date.getFullYear() + Math.floor((start_month + 1) / 12))
}

console.log(`filtering ${ical_url} for events between ${start_date.toLocaleDateString()} and ${end_date.toLocaleDateString()}`)
ical.fromURL(ical_url, {}, (err, data) => {
  if (err) {
    console.error(err);
  } else {
    const events = Object.values(data)
      .filter(_ => _.type === 'VEVENT' &&
        start_date.getTime() < _.start.getTime() &&
        _.start.getTime() < end_date.getTime())
    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    // events.forEach(_ => console.log(`${lpad(_.start.getDate(), '0', 2)}.${lpad(_.start.getMonth() + 1, '0', 2)} ${lpad(_.start.getHours(), '0', 2)}:${lpad(_.start.getMinutes(), '0', 2)} ${_.summary}`))

    pdf.pipe(createWriteStream(`Events-${lpad(start_month + 1, '0', 2)}-${lpad((start_month + 2) % 12, '0', 2)}.pdf`));

    let current_day = '';
    let current_month = '';
    let even = false;
    let i = 0;

    events.forEach(_ => {
      const day = `${lpad(_.start.getDate(), '0', 2)}.${lpad(_.start.getMonth() + 1, '0', 2)}.`; 
      const month = _.start.getMonth();
      let line;

      if (month !== current_month) {
        i = 0;
        even = false;
        line = RH * (i++ + 1);
        if (current_month) {
          pdf.addPage();
        }
        pdf
          .font(FONT_BOLD)
          .fontSize(FS_HEADLINE)
          .text(month_names[month], 2 * RW, line - .125 * RH);
      }
      line = RH * (i++ + 1);

      pdf.font(FONT_NORMAL)
        .fontSize(FS);

      if (day !== current_day) {
        even = !even;
      }

      if (even) {
        pdf
          .save()
          .rect(RW, RH * (i - .125), 59 * RW, RH)
          .fill('#ebebeb')
          .restore();
      }

      if (day !== current_day) {
        pdf
          .text(day_names[_.start.getDay()] + '.', 2 * RW, line)
          .text(day, 5 * RW, line);
      }

      pdf
        .text(`${lpad(_.start.getHours(), '0', 2)}:${lpad(_.start.getMinutes(), '0', 2)}`, 9 * RW, line)
        .text(_.summary, 13 * RW, line);
      
      current_day = day;
      current_month = month;
    })

    pdf.end();
  }
});