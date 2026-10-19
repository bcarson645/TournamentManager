'use client'

import type { MonitoringScorecard, MonitoringScorecardInnings } from '../../data/monitoringScorecards'

function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '—'
  return ((runs / balls) * 100).toFixed(1)
}

function InningsBlock({ innings }: { innings: MonitoringScorecardInnings }) {
  const hasBatting = innings.batters.length > 0

  return (
    <div className="monitoring-sc-innings">
      <div className="monitoring-sc-innings-head">
        <h4 className="monitoring-sc-innings-title">{innings.label}</h4>
        <span className="monitoring-sc-innings-total">{innings.total}</span>
        {innings.overs ? <span className="monitoring-sc-innings-overs">{innings.overs}</span> : null}
      </div>
      {hasBatting ? (
        <>
          <table className="monitoring-sc-table">
            <thead>
              <tr>
                <th scope="col">Batter</th>
                <th scope="col">R</th>
                <th scope="col">B</th>
                <th scope="col">4s</th>
                <th scope="col">6s</th>
                <th scope="col">SR</th>
              </tr>
            </thead>
            <tbody>
              {innings.batters.map((b) => (
                <tr key={b.name + b.runs}>
                  <td>
                    <span className="monitoring-sc-batter-name">{b.name}</span>
                    <span className="monitoring-sc-dismissal">{b.dismissal}</span>
                  </td>
                  <td className="monitoring-sc-num">{b.runs}</td>
                  <td className="monitoring-sc-num">{b.balls}</td>
                  <td className="monitoring-sc-num">{b.fours}</td>
                  <td className="monitoring-sc-num">{b.sixes}</td>
                  <td className="monitoring-sc-num">{strikeRate(b.runs, b.balls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="monitoring-sc-extras">Extras {innings.extras}</p>
          {innings.bowlers.length > 0 ? (
            <table className="monitoring-sc-table monitoring-sc-table--bowl">
              <thead>
                <tr>
                  <th scope="col">Bowler</th>
                  <th scope="col">O</th>
                  <th scope="col">M</th>
                  <th scope="col">R</th>
                  <th scope="col">W</th>
                </tr>
              </thead>
              <tbody>
                {innings.bowlers.map((b) => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td className="monitoring-sc-num">{b.overs}</td>
                    <td className="monitoring-sc-num">{b.maidens}</td>
                    <td className="monitoring-sc-num">{b.runs}</td>
                    <td className="monitoring-sc-num">{b.wickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : (
        <p className="monitoring-sc-placeholder">{innings.total}</p>
      )}
    </div>
  )
}

export default function MonitoringScorecardView({ scorecard }: { scorecard: MonitoringScorecard }) {
  return (
    <div className="monitoring-scorecard">
      <h3 className="monitoring-fs-scorecard-title">Scorecard</h3>
      {scorecard.innings.map((inn) => (
        <InningsBlock key={inn.label} innings={inn} />
      ))}
    </div>
  )
}
