import createAction from 'redux-actions/lib/createAction';
import model from 'stores/falcor-model';
import { isUndefined, values } from 'lodash';

// The number of previews shown on a page
const PREVIEWS_VISIBLE_PER_PAGE = 5;

// The number that the starting index changes when paging forward/backward (this is -1 because the last preview visible
// in the list is technically part of the next page and navigates to the next page when clicked)
export const PREVIEW_INDEX_CHANGE_PER_PAGE = PREVIEWS_VISIBLE_PER_PAGE - 1;

// The number of previews to fetch when going to the server after the initial page 
const PREVIEWS_TO_FETCH = 20;

/**
 * Public action constants
 */
export const LOAD = 'videoPreviewList/LOAD';
export const UNLOAD = 'videoPreviewList/UNLOAD';

export const REQUEST_PREVIEWS = 'videoPreviewList/REQUEST_PREVIEWS';
export const RECEIVE_PREVIEWS_MODEL = 'videoPreviewList/RECEIVE_PREVIEWS_MODEL';
export const RECEIVE_PREVIEWS = 'videoPreviewList/RECEIVE_PREVIEWS';

export const NEXT_PAGE = 'videoPreviewList/NEXT_PAGE';
export const PREVIOUS_PAGE = 'videoPreviewList/PREVIOUS_PAGE';

/**
 * Private action creators
 */
const requestPreviews = createAction(REQUEST_PREVIEWS, list => ({ list }));
const receivePreviewsModel = createAction(RECEIVE_PREVIEWS_MODEL, (list, previewsModel) => ({ list, previewsModel }));
const receivePreviews = createAction(RECEIVE_PREVIEWS, (list, previews, morePreviewsAvailable) => ({ list, previews, morePreviewsAvailable }));
const nextPage = createAction(NEXT_PAGE, list => ({ list }));
const previousPage = createAction(PREVIOUS_PAGE, list => ({ list }));

function fetchPreviews(list, previewsQueries, numberToFetch) {
  return (dispatch, getState) => {
    // Get the queries from private state
    let { 
      videoPreviews: {
        _private: { 
          [ list ]: { previewsModel, startIndex }
        } 
      } 
    } = getState();
    
    // Add paging information and get the data from the server
    const queries = previewsQueries.map(q => [ { from: startIndex, length: numberToFetch }, ...q ]);
    
    // After fetching, dispatch the results to the UI
    return previewsModel.get(...queries).then(response => {
      const previews = isUndefined(response) ? [] : values(response.json);
      const morePreviewsAvailable = previews.length === numberToFetch;
      return dispatch(receivePreviews(list, previews, morePreviewsAvailable));
    });
  };
}

/**
 * Public action creators
 */

export const load = createAction(LOAD, (list, previewsQueryRoot) => ({ list, previewsQueryRoot }));
export const unload = createAction(UNLOAD, list => ({ list }));

// Get the initial previews for the list
export function getPreviews(list, previewsQueries) {
  return (dispatch, getState) => {
    let {
      videoPreviews: {
        _private: {
          [ list ]: { previewsQueryRoot }
        }
      }
    } = getState();
    
    // Let the UI know we're going to the server
    dispatch(requestPreviews(list));
    const queries = previewsQueries.map(q => [ { from: 0, length: PREVIEWS_VISIBLE_PER_PAGE }, ...q ]);
    
    // Use deref to load a model bound to the query root for the list
    return model.deref(previewsQueryRoot, ...queries).toPromise().then(previewsModel => {
      // Save the derefed model for future queries
      dispatch(receivePreviewsModel(list, previewsModel));
      
      // Do the actual queries (data should already be there from deref queries)
      return dispatch(fetchPreviews(list, previewsQueries, PREVIEWS_VISIBLE_PER_PAGE));
    });
  };
};

export function nextPageClick(list, previewsQueries) {
  return (dispatch, getState) => {
    // Pull some of the current state
    let { 
      videoPreviews: {
        lists: {
          [ list ]: { previews, currentPageIndex }
        },
        _private: {
          [ list ]: { morePreviewsAvailable }
        }
      }
    } = getState();
    
    // Are we at the end of the preview list and out of pages on the server?
    const nextPageStartIdx = currentPageIndex + PREVIEW_INDEX_CHANGE_PER_PAGE;
    if (morePreviewsAvailable === false && nextPageStartIdx >= previews.length) {
      return;
    }
    
    // Can we show the next page without going to the server or are we out of pages on the server?
    const nextPageEndIdx = nextPageStartIdx + PREVIEWS_VISIBLE_PER_PAGE - 1;
    if (nextPageEndIdx < previews.length || morePreviewsAvailable === false) {
      return dispatch(nextPage(list));
    }
    
    // There are more pages available on the server and we need them, so go get them then go to the next page
    dispatch(requestPreviews(list));
    return dispatch(fetchPreviews(list, previewsQueries, PREVIEWS_TO_FETCH)).then(fetchDone => dispatch(nextPage(list)));
  };
};

export function previousPageClick(list) {
  return (dispatch, getState) => {
    let { 
      videoPreviews: {
        lists: {
          [ list ]: { currentPageIndex }
        }
      }
    } = getState();
    
    if (currentPageIndex === 0) return;
    return dispatch(previousPage(list));
  };
};
