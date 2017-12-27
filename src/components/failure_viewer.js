import React, { Component } from 'react';

import * as queryString from 'query-string';
import { fileRevisionCoverage, failureCoverageForRevisionWithActiveData, fileRevisionCoverageSummary, fileRevisionWithActiveData, rawFile, passingCoverageForRevisionWithActiveData} from '../utils/data';
import { TestsSideViewer, CoveragePercentageViewer } from './fileviewercov';

// FileViewer loads a raw file for a given revision from Mozilla's hg web.
// It uses test coverage information from Active Data to show coverage
// for runnable lines.
export default class FileViewerContainer2 extends Component {
  constructor(props) {
    super(props);
    this.state = this.parseQueryParams();
    this.setSelectedLine = this.setSelectedLine.bind(this);
  }

  async componentDidMount() {
    const { revision, path } = this.state;
    await this.fetchData(revision, path, 'mozilla-central');
  }

  setSelectedLine(selectedLineNumber) {
    // click on a selected line to deselect the line
    if (selectedLineNumber === this.state.selectedLine) {
      this.setState({ selectedLine: undefined });
    } else {
      this.setState({ selectedLine: selectedLineNumber });
    }
  }

  async fetchData(revision, path, repoPath = 'integration/mozilla-inbound') {
    // Get source code from hg
    const fileSource = async () => {
      this.setState({ parsedFile: (await rawFile(revision, path, repoPath)).split('\n') });
    };
    // Get coverage1 from ActiveData
    const coverageData = async () => {
      const { data } = await failureCoverageForRevisionWithActiveData(revision, path, repoPath);
      console.log(data);
      this.setState({ coverage: fileRevisionCoverageSummary(data) });
    };
    // Get coverage2 from ActiveData
    const coverageData2 = async () => {
      const { data2 } = await passingCoverageForRevisionWithActiveData(revision, path, repoPath);
      console.log(data2);
      this.setState({ coveragetwo: fileRevisionCoverageSummary(data2) });
    };
    // Fetch source code and coverage in parallel
    try {
      await Promise.all([fileSource(), coverageData(), coverageData2()]);
    } catch (error) {
      this.setState({ appErr: `${error.name}: ${error.message}` });
    }
  }

  parseQueryParams() {
    const parsedQuery = queryString.parse(this.props.location.search);
    const out = {
      appError: undefined,
      revision: undefined,
      path: undefined,
    };
    if (!parsedQuery.revision || !parsedQuery.path) {
      out.appErr = "Undefined URL query ('revision', 'path' fields are required)";
    } else {
      // Remove beginning '/' in the path parameter to fetch from source,
      // makes both path=/path AND path=path acceptable in the URL query
      // Ex. "path=/accessible/atk/Platform.cpp" AND "path=accessible/atk/Platform.cpp"
      out.revision = parsedQuery.revision;
      out.path = parsedQuery.path.startsWith('/') ? parsedQuery.path.slice(1) : parsedQuery.path;
    }
    return out;
  }

  render() {
    const { parsedFile, coverage, coveragetwo, selectedLine } = this.state;
    console.log(coveragetwo);
    return (
      <div>
        <div className="file-view">
          <FileViewerMeta {...this.state} />
          { (parsedFile) && 
          <table>
              <tbody>
              <tr>
                  <td> 
                    <FileViewer {...this.state} onLineClick={this.setSelectedLine} />
                  </td>
                  <td> 
                    <FileViewer2 {...this.state} onLineClick={this.setSelectedLine} />
                  </td>
              </tr>
              </tbody>
          </table> }
        </div>
      </div>
    );
  }
}

// This component renders each line of the file with its line number
const FileViewer = ({ parsedFile, coverage, coverage2, selectedLine, key, onLineClick }) => (
  <table className="file-view-table">
    <tbody>
      {
        parsedFile.map((text, lineNumber) => (
          <Line
            key={text.id}
            key2={1}
            lineNumber={lineNumber + 1}
            text={text}
            coverage={coverage}
            selectedLine={selectedLine}
            onLineClick={onLineClick}
          />
        ))
      }
    </tbody>
  </table>
);

const FileViewer2 = ({ parsedFile, coverage, coverage2, selectedLine, onLineClick }) => (
  <table className="file-view-table2">
    <tbody>
      {
        parsedFile.map((text, lineNumber) => (
          <Line2
            key={text.id}
            lineNumber={lineNumber + 1}
            text={text}
            coverage={coverage2}
            selectedLine={selectedLine}
            onLineClick={onLineClick}
          />
        ))
      }
    </tbody>
  </table>
);

const Line = ({ key2, lineNumber, text, coverage, selectedLine, onLineClick }) => {
  const handleOnClick = () => {
    onLineClick(lineNumber);
  };

  const select = (lineNumber === selectedLine) ? 'selected' : '';

  let nTests;
  let color;
  if (coverage) {
    // hit line
    if (coverage.coveredLines.find(element => element === lineNumber)) {
      nTests = coverage.testsPerHitLine[lineNumber].length;
      color = 'hit';
    // miss line
    } else if (coverage.uncoveredLines.find(element => element === lineNumber)) {
      color = 'miss';
    }
  }

  return (
    <tr className={`file-line ${select} ${color}`} onClick={handleOnClick}>
      <td className="file-line-number">{lineNumber}</td>
      <td className="file-line-tests">
        { nTests && <span className="tests">{nTests}</span> }
      </td>
      <td className="file-line-text"><pre>{text}</pre></td>
    </tr>
  );
};

const Line2 = ({ lineNumber, text, coverage, selectedLine, onLineClick }) => {
  const handleOnClick = () => {
    onLineClick(lineNumber);
  };

  const select = (lineNumber === selectedLine) ? 'selected' : '';

  let nTests;
  let color;
  if (coverage) {
    // hit line
    if (coverage.coveredLines.find(element => element === lineNumber)) {
      nTests = coverage.testsPerHitLine[lineNumber].length;
      color = 'hit';
    // miss line
    } else if (coverage.uncoveredLines.find(element => element === lineNumber)) {
      color = 'miss';
    }
  }

  return (
    <tr className={`file-line ${select} ${color}`} onClick={handleOnClick}>
      <td className="file-line-number">{lineNumber}</td>
      <td className="file-line-tests">
        { nTests && <span className="tests">{nTests}</span> }
      </td>
      <td className="file-line-text"><pre>{text}</pre></td>
    </tr>
  );
};

// This component contains metadata of the file
const FileViewerMeta = ({ revision, path, appErr, parsedFile, coverage }) => {
  const showStatus = (label, data) => {
    let msg;
    if (!data) {
      msg = <span>&#x2026;</span>; // horizontal ellipsis
    } else {
      msg = <span>&#x2714;</span>; // heavy checkmark
    }
    return (<li className="file-meta-li">{label}: {msg}</li>);
  };

  return (
    <div>
      <div className="file-meta-center">
        <div className="file-meta-title">File Coverage</div>
        { (coverage) && <CoveragePercentageViewer coverage={coverage} /> }
        <div className="file-meta-status">
          <ul className="file-meta-ul">
            { showStatus('Source code', parsedFile) }
            { showStatus('Coverage', coverage) }
          </ul>
        </div>
      </div>
      {appErr && <span className="error-message">{appErr}</span>}

      <div className="file-summary">
        <span className="file-path">{path}</span>
      </div>
      <div className="file-meta-revision">revision number: {revision}</div>
    </div>
  );
};
